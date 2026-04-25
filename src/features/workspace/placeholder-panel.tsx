import type { LeftbarNavItem } from "@/components/layout/types";

type PlaceholderPanelProps = {
    section: LeftbarNavItem;
};

export function PlaceholderPanel({ section }: PlaceholderPanelProps) {
    const Icon = section.icon;

    return (
        <section className="overflow-hidden border border-main bg-main">
            <header className="flex items-start justify-between gap-4 border-b border-main bg-secondary/45 px-5 py-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted" />
                        <h1 className="truncate text-[15px] font-semibold text-main">
                            {section.label}
                        </h1>
                    </div>
                    <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted">
                        {section.description}
                    </p>
                </div>
                {section.badge ? (
                    <span className="shrink-0 border border-main bg-main px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                        {section.badge}
                    </span>
                ) : null}
            </header>

            <div className="px-5 py-5">
                <div className="border border-dashed border-main bg-secondary/30 px-4 py-3">
                    <p className="text-[12px] font-medium text-main">
                        Not implemented yet
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-muted">
                        Mục này đã được đăng ký trong leftbar. UI và logic riêng
                        sẽ được triển khai trong feature module tương ứng.
                    </p>
                </div>
            </div>
        </section>
    );
}
