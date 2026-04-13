export function AppLoadingFallback() {
    return (
        <div className="flex justify-center items-center min-h-screen bg-[var(--bg-page)]">
            <span className="w-12 h-12 rounded-full border-4 border-[var(--color-oxygen-500)] border-t-transparent animate-spin" />
        </div>
    );
}
