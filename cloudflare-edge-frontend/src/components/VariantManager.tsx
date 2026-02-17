import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVariant } from "@/services/api";

export function VariantManager({ deploymentId }: { deploymentId: number }) {
    const [urlPath, setUrlPath] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('');

    const handleSave = async () => {
        try {
            await createVariant(deploymentId, urlPath, content);
            setStatus('Saved!');
            setTimeout(() => setStatus(''), 2000);
        } catch (err) {
            setStatus('Error saving variant');
        }
    };

    return (
        <div className="border p-4 rounded mt-4 bg-gray-50">
            <h4 className="font-semibold mb-2">Add Optimized Variant</h4>
            <div className="space-y-2">
                <Input
                    placeholder="/path/to/page (e.g. /pricing)"
                    value={urlPath}
                    onChange={(e) => setUrlPath(e.target.value)}
                />
                <textarea
                    className="w-full h-32 p-2 border rounded"
                    placeholder="<html><body><h1>Optimized Content</h1></body></html>"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex justify-between items-center">
                    <Button size="sm" onClick={handleSave}>Save Variant</Button>
                    {status && <span className="text-sm text-green-600">{status}</span>}
                </div>
            </div>
        </div>
    );
}
