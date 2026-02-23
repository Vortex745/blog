export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                    <span className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                    <span
                        className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"
                    />
                </div>
                <p className="text-muted font-serif font-bold text-sm tracking-widest animate-pulse">
                    LOADING...
                </p>
            </div>
        </div>
    );
}
