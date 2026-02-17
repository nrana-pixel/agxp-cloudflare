import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    connectCloudflare,
    getZones,
    createDeployment,
    getDeployments,
    getAnalytics,
    createVariant,
    autoGenerateVariant
} from "@/services/api";

const normalizeSourceUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';

    let normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const match = normalized.match(/^(https?:\/\/)(.*)$/i);
    if (match) {
        const [, protocol, rest] = match;
        normalized = rest.toLowerCase().startsWith('www.') ? normalized : `${protocol}www.${rest}`;
    }

    return normalized;
};

const normalizeVariantPath = (raw: string) => {
    let path = raw.trim();

    if (!path) {
        return '/';
    }

    // If user pasted a full URL, extract the pathname
    if (/^https?:\/\//i.test(path)) {
        try {
            const url = new URL(path);
            path = url.pathname + url.search + url.hash;
        } catch {
            // Fall through to best-effort cleanup
            path = path.replace(/^https?:\/\//i, '');
        }
    }

    // Remove domain if entered without protocol (e.g., example.com/about)
    if (!path.startsWith('/') && /[.]/.test(path.split('/')[0])) {
        const firstSlash = path.indexOf('/');
        path = firstSlash === -1 ? '' : path.slice(firstSlash);
    }

    if (!path.startsWith('/')) {
        path = `/${path}`;
    }

    return path || '/';
};

/**
 * Nothing.tech-inspired minimal dashboard
 */
const Dashboard = () => {
    const [token, setToken] = useState('');
    const [zones, setZones] = useState<any[]>([]);
    const [deployments, setDeployments] = useState<any[]>([]);
    const [activeView, setActiveView] = useState<'connect' | 'deployments' | 'analytics'>('connect');
    const [selectedZone, setSelectedZone] = useState('');
    const [siteId, setSiteId] = useState('');
    const [selectedDeployment, setSelectedDeployment] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [notification, setNotification] = useState('');

    // Variant creation state
    const [showVariantForm, setShowVariantForm] = useState(false);
    const [variantPath, setVariantPath] = useState('');
    const [variantContent, setVariantContent] = useState('');
    const [autoMode, setAutoMode] = useState<'manual' | 'auto'>('manual');
    const [sourceUrl, setSourceUrl] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedPreview, setGeneratedPreview] = useState<{ path: string; content: string; variantId?: number } | null>(null);

    useEffect(() => {
        // Auto-check connection on load
        const checkConnection = async () => {
            try {
                const { zones } = await getZones();
                if (zones) {
                    setZones(zones);
                }
            } catch (err) {
                // Not connected, stay on connect screen
            }
        };
        checkConnection();
    }, []);

    useEffect(() => {
        if (activeView === 'deployments') {
            loadDeployments();
        }
    }, [activeView]);

    useEffect(() => {
        if (selectedDeployment && activeView === 'analytics') {
            loadAnalytics(selectedDeployment.id);
        }
    }, [selectedDeployment, activeView]);

    const loadDeployments = async () => {
        try {
            const { deployments } = await getDeployments();
            setDeployments(deployments || []);
            if (deployments?.length > 0 && !selectedDeployment) {
                setSelectedDeployment(deployments[0]);
            }
        } catch {
            console.warn("Backend not reachable");
        }
    };

    const loadAnalytics = async (deploymentId: number) => {
        try {
            const data = await getAnalytics(deploymentId);
            setAnalytics(data);
        } catch {
            console.warn("Analytics not available");
        }
    };

    const handleConnect = async () => {
        if (!token) return;
        try {
            await connectCloudflare(token);
            const { zones } = await getZones();
            setZones(zones || []);
            setNotification("Connected");
            setTimeout(() => setNotification(''), 2000);
        } catch (err: any) {
            setNotification("Connection failed");
            setTimeout(() => setNotification(''), 2000);
        }
    };

    const handleDeploy = async () => {
        const zoneName = zones.find(z => z.id === selectedZone)?.name;
        if (!zoneName || !siteId) return;
        try {
            await createDeployment(selectedZone, zoneName, siteId);
            setNotification("Deployed");
            setTimeout(() => setNotification(''), 2000);
            loadDeployments();
            setActiveView('deployments');
        } catch (err: any) {
            setNotification("Deployment failed");
            setTimeout(() => setNotification(''), 2000);
        }
    };

    const handleCreateVariant = async () => {
        if (!selectedDeployment || !variantPath) return;
        const normalizedPath = normalizeVariantPath(variantPath);
        setVariantPath(normalizedPath);
        setIsSubmitting(true);
        try {
            if (autoMode === 'manual') {
                if (!variantContent) {
                    setIsSubmitting(false);
                    return;
                }
                await createVariant(selectedDeployment.id, normalizedPath, variantContent);
                setNotification("Variant created");
                setTimeout(() => setNotification(''), 2000);
                setShowVariantForm(false);
                setVariantPath('');
                setVariantContent('');
                setSourceUrl('');
                setInstructions('');
                setGeneratedPreview(null);
            } else {
                if (!sourceUrl) {
                    setIsSubmitting(false);
                    return;
                }
                const normalizedSourceUrl = normalizeSourceUrl(sourceUrl);
                setSourceUrl(normalizedSourceUrl);
                const result = await autoGenerateVariant(selectedDeployment.id, normalizedPath, normalizedSourceUrl, instructions || undefined);
                if (!result.success) {
                    setNotification(result.error || 'Failed to auto-generate variant');
                    setTimeout(() => setNotification(''), 2000);
                    setGeneratedPreview(null);
                    return;
                }
                const previewContent = result.contentPreview || 'Preview unavailable. Check the variant list to view the stored HTML.';
                setGeneratedPreview({ path: variantPath, content: previewContent, variantId: result.variantId });
                setNotification("Variant auto-generated");
                setTimeout(() => setNotification(''), 2000);
            }
        } catch {
            setNotification("Failed to create variant");
            setTimeout(() => setNotification(''), 2000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Notification */}
            {notification && (
                <div className="fixed top-8 right-8 bg-black text-white px-6 py-3 text-sm font-medium animate-fade-in z-50">
                    {notification}
                </div>
            )}

            {/* Header */}
            <header className="border-b border-black/10">
                <div className="max-w-7xl mx-auto px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-display mb-2">EDGE DELIVERY</h1>
                            <p className="text-sm text-muted-foreground mt-1">AI-optimized content at the edge</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveView('connect')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeView === 'connect'
                                    ? 'bg-black text-white'
                                    : 'text-black hover:bg-black/5'
                                    }`}
                            >
                                Connect
                            </button>
                            <button
                                onClick={() => setActiveView('deployments')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeView === 'deployments'
                                    ? 'bg-black text-white'
                                    : 'text-black hover:bg-black/5'
                                    }`}
                            >
                                Deployments
                            </button>
                            <button
                                onClick={() => setActiveView('analytics')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${activeView === 'analytics'
                                    ? 'bg-black text-white'
                                    : 'text-black hover:bg-black/5'
                                    }`}
                                disabled={!selectedDeployment}
                            >
                                Analytics
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-8 py-16">

                {/* Connect View */}
                {activeView === 'connect' && (
                    <div className="max-w-2xl animate-fade-in">
                        <h2 className="text-headline mb-4">Connect Cloudflare</h2>
                        <p className="text-body text-muted-foreground mb-12">
                            Paste your API token to deploy edge workers to your domains.
                        </p>

                        <div className="space-y-6">
                            {zones.length === 0 ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">API Token</label>
                                        <Input
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            placeholder="Enter your Cloudflare API token"
                                            type="password"
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleConnect}
                                        disabled={!token}
                                        className="w-full bg-black text-white hover:bg-black/90"
                                    >
                                        Connect Account
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="p-6 border border-black/10 bg-black/[0.02]">
                                        <p className="text-sm font-medium mb-4">Connected • {zones.length} zones available</p>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Select Zone</label>
                                                <select
                                                    value={selectedZone}
                                                    onChange={(e) => setSelectedZone(e.target.value)}
                                                    className="w-full px-4 py-3 border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                                >
                                                    <option value="">Choose a domain</option>
                                                    {zones.map((zone: any) => (
                                                        <option key={zone.id} value={zone.id}>{zone.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Site ID</label>
                                                <Input
                                                    value={siteId}
                                                    onChange={(e) => setSiteId(e.target.value)}
                                                    placeholder="e.g., blog-prod"
                                                    className="font-mono text-sm"
                                                />
                                            </div>
                                            <Button
                                                onClick={handleDeploy}
                                                disabled={!selectedZone || !siteId}
                                                className="w-full bg-black text-white hover:bg-black/90"
                                            >
                                                Deploy Worker
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Deployments View */}
                {activeView === 'deployments' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-headline mb-2">Deployments</h2>
                                <p className="text-caption">{deployments.length} active</p>
                            </div>
                            <Button
                                onClick={loadDeployments}
                                variant="outline"
                                className="border-black/10"
                            >
                                Refresh
                            </Button>
                        </div>

                        {deployments.length === 0 ? (
                            <div className="text-center py-24 border border-dashed border-black/10">
                                <p className="text-muted-foreground mb-4">No deployments yet</p>
                                <Button
                                    onClick={() => setActiveView('connect')}
                                    variant="outline"
                                    className="border-black/10"
                                >
                                    Create First Deployment
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {deployments.map((d: any) => (
                                    <div
                                        key={d.id}
                                        className="border border-black/10 p-8 hover:border-black/20 transition-colors cursor-pointer"
                                        onClick={() => {
                                            setSelectedDeployment(d);
                                            setActiveView('analytics');
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-title mb-2">{d.zoneName}</h3>
                                                <p className="text-caption font-mono">{d.workerName}</p>
                                                <p className="text-caption mt-2">
                                                    Deployed {new Date(d.deployedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className={`px-3 py-1 text-xs font-medium ${d.status === 'active'
                                                    ? 'bg-black text-white'
                                                    : 'bg-black/5 text-black'
                                                    }`}>
                                                    {d.status}
                                                </span>
                                            </div>
                                        </div>

                                        {selectedDeployment?.id === d.id && (
                                            <div className="mt-8 pt-8 border-t border-black/10" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-medium">Variants</h4>
                                                    <Button
                                                        onClick={() => setShowVariantForm(!showVariantForm)}
                                                        size="sm"
                                                        className="bg-black text-white hover:bg-black/90"
                                                    >
                                                        {showVariantForm ? 'Cancel' : 'New Variant'}
                                                    </Button>
                                                </div>

                                                {showVariantForm && (
                                                    <div className="space-y-4 mb-6 p-6 bg-black/[0.02] border border-black/10">
                                                        <div className="flex gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAutoMode('manual');
                                                                    setGeneratedPreview(null);
                                                                }}
                                                                className={`flex-1 border px-4 py-2 text-sm font-medium ${autoMode === 'manual' ? 'bg-black text-white' : 'border-black/20'}`}
                                                            >
                                                                Manual HTML
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setAutoMode('auto')}
                                                                className={`flex-1 border px-4 py-2 text-sm font-medium ${autoMode === 'auto' ? 'bg-black text-white' : 'border-black/20'}`}
                                                            >
                                                                Auto Generate
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium mb-2">URL Path</label>
                                                            <Input
                                                                value={variantPath}
                                                                onChange={(e) => setVariantPath(e.target.value)}
                                                                placeholder="/pricing"
                                                                className="font-mono text-sm"
                                                            />
                                                        </div>
                                                        {autoMode === 'manual' ? (
                                                            <div>
                                                                <label className="block text-sm font-medium mb-2">HTML Content</label>
                                                                <textarea
                                                                    value={variantContent}
                                                                    onChange={(e) => setVariantContent(e.target.value)}
                                                                    placeholder="<html>...</html>"
                                                                    className="w-full px-4 py-3 border border-black/10 bg-white font-mono text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-black"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div>
                                                                    <label className="block text-sm font-medium mb-2">Source URL</label>
                                                                    <Input
                                                                        value={sourceUrl}
                                                                        onChange={(e) => setSourceUrl(e.target.value)}
                                                                        onBlur={(e) => setSourceUrl(normalizeSourceUrl(e.target.value))}
                                                                        placeholder="https://example.com/landing"
                                                                        className="font-mono text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-medium mb-2">Optional Instructions</label>
                                                                    <textarea
                                                                        value={instructions}
                                                                        onChange={(e) => setInstructions(e.target.value)}
                                                                        placeholder="Tone, CTA, layout guidance..."
                                                                        className="w-full px-4 py-3 border border-black/10 bg-white text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-black"
                                                                    />
                                                                </div>
                                                            </>
                                                        )}
                                                        <Button
                                                            onClick={handleCreateVariant}
                                                            disabled={isSubmitting || !variantPath || (autoMode === 'manual' ? !variantContent : !sourceUrl)}
                                                            className="w-full bg-black text-white hover:bg-black/90"
                                                        >
                                                            {isSubmitting ? 'Submitting...' : autoMode === 'manual' ? 'Create Variant' : 'Auto Generate'}
                                                        </Button>
                                                    </div>
                                                )}

                                                {generatedPreview && (
                                                    <div className="space-y-4 mb-6 p-6 border border-dashed border-black/20 bg-white">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <p className="text-sm font-medium">Latest auto-generated preview</p>
                                                                <p className="text-xs text-muted-foreground font-mono">Path: {generatedPreview.path}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="border-black/20"
                                                                    onClick={() => setGeneratedPreview(null)}
                                                                >
                                                                    Dismiss
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    className="bg-black text-white hover:bg-black/80"
                                                                    onClick={async () => {
                                                                        if (!selectedDeployment || !generatedPreview.path || !generatedPreview.content) return;
                                                                        setIsSubmitting(true);
                                                                        try {
                                                                            await createVariant(selectedDeployment.id, generatedPreview.path, generatedPreview.content);
                                                                            setNotification('Variant saved to KV');
                                                                            setTimeout(() => setNotification(''), 2000);
                                                                            setGeneratedPreview(null);
                                                                        } catch {
                                                                            setNotification('Failed to save variant');
                                                                            setTimeout(() => setNotification(''), 2000);
                                                                        } finally {
                                                                            setIsSubmitting(false);
                                                                        }
                                                                    }}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    Save to KV
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Editable HTML</p>
                                                                <textarea
                                                                    value={generatedPreview.content}
                                                                    onChange={(e) => setGeneratedPreview(prev => prev ? { ...prev, content: e.target.value } : prev)}
                                                                    className="w-full px-4 py-3 border border-black/10 bg-white font-mono text-xs min-h-[260px]"
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Rendered Preview</p>
                                                                <div className="border border-black/10 bg-white p-4 min-h-[260px] overflow-auto">
                                                                    <div dangerouslySetInnerHTML={{ __html: generatedPreview.content }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Analytics View */}
                {activeView === 'analytics' && selectedDeployment && (
                    <div className="animate-fade-in">
                        <div className="mb-12">
                            <h2 className="text-headline mb-2">{selectedDeployment.zoneName}</h2>
                            <p className="text-caption">Analytics Dashboard</p>
                        </div>

                        {!analytics ? (
                            <div className="text-center py-24">
                                <p className="text-muted-foreground">Loading analytics...</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="border border-black/10 p-6">
                                        <p className="text-caption mb-2">Total Requests</p>
                                        <p className="text-4xl font-bold">{analytics.totalRequests.toLocaleString()}</p>
                                    </div>
                                    <div className="border border-black/10 p-6">
                                        <p className="text-caption mb-2">Variants Served</p>
                                        <p className="text-4xl font-bold">{analytics.variantsServed.toLocaleString()}</p>
                                    </div>
                                    <div className="border border-black/10 p-6">
                                        <p className="text-caption mb-2">Conversion Rate</p>
                                        <p className="text-4xl font-bold">
                                            {analytics.totalRequests > 0
                                                ? Math.round((analytics.variantsServed / analytics.totalRequests) * 100)
                                                : 0}%
                                        </p>
                                    </div>
                                    <div className="border border-black/10 p-6">
                                        <p className="text-caption mb-2">Unique Bots</p>
                                        <p className="text-4xl font-bold">{Object.keys(analytics.botTypes || {}).length}</p>
                                    </div>
                                </div>

                                {/* Bot Types */}
                                {analytics.botTypes && Object.keys(analytics.botTypes).length > 0 && (
                                    <div>
                                        <h3 className="text-title mb-6">Bot Distribution</h3>
                                        <div className="space-y-3">
                                            {Object.entries(analytics.botTypes)
                                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                                .map(([bot, count]) => (
                                                    <div key={bot} className="flex items-center gap-4">
                                                        <div className="w-32 text-sm font-medium">{bot}</div>
                                                        <div className="flex-1 bg-black/5 h-8 relative">
                                                            <div
                                                                className="bg-black h-full transition-all duration-500"
                                                                style={{
                                                                    width: `${(count as number / analytics.totalRequests) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="w-16 text-right text-sm font-medium">
                                                            {count as number}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Top Paths */}
                                {analytics.topPaths && analytics.topPaths.length > 0 && (
                                    <div>
                                        <h3 className="text-title mb-6">Top Pages</h3>
                                        <div className="border border-black/10">
                                            {analytics.topPaths.map((item: any, idx: number) => (
                                                <div
                                                    key={item.path}
                                                    className={`flex items-center justify-between p-4 ${idx !== analytics.topPaths.length - 1 ? 'border-b border-black/10' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-caption w-8">{idx + 1}</span>
                                                        <span className="font-mono text-sm">{item.path}</span>
                                                    </div>
                                                    <span className="font-medium">{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {analytics.totalRequests === 0 && (
                                    <div className="text-center py-24 border border-dashed border-black/10">
                                        <p className="text-muted-foreground mb-2">No analytics data yet</p>
                                        <p className="text-caption">AI bots haven't visited your site yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-black/10 mt-24">
                <div className="max-w-7xl mx-auto px-8 py-8">
                    <p className="text-caption">Edge Delivery © 2026</p>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
