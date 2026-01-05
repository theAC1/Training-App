
import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    gradient?: boolean;
}

export const FloatingCard = React.forwardRef<HTMLDivElement, FloatingCardProps>(
    ({ className, children, gradient = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-2xl bg-card text-card-foreground p-6",
                    "shadow-floating transition-all duration-300 hover:shadow-floating-hover",
                    "border border-white/5 dark:border-white/5", // Subtle glass border
                    "hover:-translate-y-1", // Lift effect
                    gradient && "bg-gradient-to-br from-card to-secondary/30",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
FloatingCard.displayName = "FloatingCard";
