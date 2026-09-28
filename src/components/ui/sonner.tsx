"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-control",
          description: "group-[.toast]:text-muted",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-on-primary group-[.toast]:rounded-control",
          cancelButton:
            "group-[.toast]:bg-surface-2 group-[.toast]:text-foreground group-[.toast]:rounded-control",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
