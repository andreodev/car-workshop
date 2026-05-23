export default function Header({title, description}: {title: string, description: string}) { 
    return (
        <div className="flex flex-col gap-0.5">
            <div className="mb-1 h-0.5 w-8 rounded-full bg-primary" />
            <h1 className="font-heading text-3xl font-800 uppercase tracking-wide text-foreground">
                {title}
            </h1>
            <p className="text-sm text-muted-foreground">
                {description}
            </p>
        </div>
    )
}