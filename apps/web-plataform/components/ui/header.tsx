export default function Header({ title, description }: { title: string; description?: string }) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="mb-1 h-0.5 w-8 rounded-full bg-primary" />
                <h1 className="max-w-full break-words font-heading text-2xl font-800 uppercase leading-tight tracking-wide text-foreground sm:text-3xl">
                    {title}
                </h1>
                <p className="max-w-full text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
