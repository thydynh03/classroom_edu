"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  ChevronRight,
  ArrowLeft,
  XCircle,
  Sparkles,
  ExternalLink,
  Layers,
  Palette,
  Type,
  LayoutGrid,
  MoreVertical,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  SubmissionStatusBadge,
  type SubmissionStatus,
} from "@/components/domain/submission-status-badge";
import { ClassChip, type ClassColor } from "@/components/domain/class-chip";
import { DeadlineChip } from "@/components/domain/deadline-chip";
import { StatTile } from "@/components/domain/stat-tile";
import { SegmentedProgress } from "@/components/domain/segmented-progress";

interface TokenItem {
  name: string;
  usage: string;
}

const TOKENS: TokenItem[] = [
  { name: "--background", usage: "Nền chính toàn trang" },
  { name: "--sidebar", usage: "Thanh rail / sidebar" },
  { name: "--surface", usage: "Card nổi, modal, panel" },
  { name: "--surface-2", usage: "Nền phụ, input, chip trung tính" },
  { name: "--border", usage: "Đường viền các thành phần (1px)" },
  { name: "--foreground", usage: "Màu chữ chính" },
  { name: "--muted", usage: "Màu chữ phụ, chú thích" },
  { name: "--primary", usage: "Nút chính, link, trạng thái chọn" },
  { name: "--primary-hover", usage: "Hover nút chính" },
  { name: "--primary-soft", usage: "Nền mục menu đang chọn, badge nhẹ" },
  { name: "--on-primary", usage: "Chữ trên nút primary" },
  { name: "--progress", usage: "Thanh tiến độ, ring đồ thị" },
  { name: "--success", usage: "Đã nộp đúng hạn, Đã chấm" },
  { name: "--success-soft", usage: "Nền trạng thái thành công" },
  { name: "--warning", usage: "Nộp trễ, sắp hết hạn" },
  { name: "--warning-soft", usage: "Nền trạng thái cảnh báo" },
  { name: "--late-bar", usage: "Đoạn bài nộp trễ trong biểu đồ" },
  { name: "--danger", usage: "Quá hạn, lỗi, nút hủy" },
  { name: "--danger-soft", usage: "Nền trạng thái lỗi / quá hạn" },
  { name: "--info", usage: "Đã trả bài, tin tức" },
  { name: "--info-soft", usage: "Nền trạng thái thông tin" },
  { name: "--ring", usage: "Focus ring 2px khi điều hướng phím" },
];

const CLASS_COLORS: Array<{ name: ClassColor; label: string; desc: string }> = [
  { name: "sky", label: "Sky (Xanh dương)", desc: "10A1 · Toán hình" },
  { name: "mint", label: "Mint (Bạc hà)", desc: "10A2 · Đại số" },
  { name: "peach", label: "Peach (Hồng cam)", desc: "11B3 · Vật lý" },
  { name: "lilac", label: "Lilac (Tím cà)", desc: "CLB nâng cao · Tin học" },
  { name: "butter", label: "Butter (Vàng bơ)", desc: "12C1 · Tiếng Anh" },
  { name: "rose", label: "Rose (Hồng đỏ)", desc: "Bồi dưỡng HSG · Hóa học" },
];

const SUBMISSION_STATUSES: SubmissionStatus[] = [
  "NOT_STARTED",
  "DRAFT",
  "SUBMITTED",
  "LATE",
  "GRADED",
  "RETURNED",
  "MISSING",
];

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });
  return () => observer.disconnect();
}

function getThemeSnapshot() {
  if (typeof window === "undefined") return "";
  return document.documentElement.className;
}

function getThemeServerSnapshot() {
  return "";
}

const emptySubscribe = () => () => {};

export function UiCatalog() {
  const { theme, resolvedTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const themeClass = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot
  );

  const computedColors = React.useMemo(() => {
    if (!mounted || typeof window === "undefined") return {};
    // Trigger recalculation when themeClass changes
    const _ = themeClass;
    void _;
    const styles = window.getComputedStyle(document.documentElement);
    const result: Record<string, string> = {};
    TOKENS.forEach((t) => {
      result[t.name] = styles.getPropertyValue(t.name).trim();
    });
    return result;
  }, [mounted, themeClass]);

  // Demo state for input with error
  const [demoInput, setDemoInput] = React.useState("");
  const isInputError = demoInput.length > 0 && demoInput.length < 5;

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Dev Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 px-4 py-3.5 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex size-9 items-center justify-center rounded-control border border-border bg-surface-2 text-muted hover:text-foreground transition-colors"
              aria-label="Về trang chủ"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-foreground">
                  Design System Catalog
                </span>
                <Badge
                  variant="outline"
                  className="bg-primary-soft text-primary font-mono text-[10px]"
                >
                  /dev/ui · M0c
                </Badge>
              </div>
              <p className="text-xs text-muted">
                Bảng quy chuẩn màu sắc, phông chữ, thành phần UI và Bento mockup D
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
              <span>Chủ đề:</span>
              <span className="font-semibold text-foreground capitalize">
                {mounted ? resolvedTheme || theme || "system" : "system"}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 space-y-16">
        {/* Navigation Quick Links */}
        <nav
          aria-label="Mục lục xem nhanh"
          className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 text-xs font-semibold shrink-0"
        >
          <a
            href="#tokens"
            className="rounded-full bg-surface-2 px-3 py-1.5 text-muted hover:text-foreground hover:bg-primary-soft transition-colors"
          >
            1. Token màu ({TOKENS.length})
          </a>
          <a
            href="#classes"
            className="rounded-full bg-surface-2 px-3 py-1.5 text-muted hover:text-foreground hover:bg-primary-soft transition-colors"
          >
            2. 6 Màu lớp Pastel
          </a>
          <a
            href="#typography"
            className="rounded-full bg-surface-2 px-3 py-1.5 text-muted hover:text-foreground hover:bg-primary-soft transition-colors"
          >
            3. Thang chữ
          </a>
          <a
            href="#shadcn"
            className="rounded-full bg-surface-2 px-3 py-1.5 text-muted hover:text-foreground hover:bg-primary-soft transition-colors"
          >
            4. Shadcn Components
          </a>
          <a
            href="#domain"
            className="rounded-full bg-surface-2 px-3 py-1.5 text-muted hover:text-foreground hover:bg-primary-soft transition-colors"
          >
            5. Domain Components
          </a>
          <a
            href="#bento-d"
            className="rounded-full bg-primary-soft text-primary px-3 py-1.5 transition-colors"
          >
            6. Bento Mockup D (Thu nhỏ)
          </a>
        </nav>

        {/* Section 1: Color Tokens */}
        <section id="tokens" className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Palette className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              1. Bảng Swatch Token Màu (CSS Variables)
            </h2>
          </div>
          <p className="text-sm text-muted">
            Giá trị computed đọc trực tiếp từ trình duyệt trong chủ đề hiện tại.
            Không có mã màu hardcode nào trong mã nguồn giao diện.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TOKENS.map((token) => (
              <div
                key={token.name}
                className="flex flex-col justify-between rounded-control border border-border bg-surface p-3.5 shadow-xs shrink-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: `var(${token.name})` }}
                    className="size-11 shrink-0 rounded-lg border border-border/50 shadow-xs"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs font-bold text-foreground">
                      {token.name}
                    </div>
                    <div className="truncate font-mono text-[11px] text-primary">
                      {computedColors[token.name] || "..."}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 text-xs text-muted leading-tight">
                  {token.usage}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: 6 Pastel Class Colors */}
        <section id="classes" className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Layers className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              2. 6 Màu Lớp Học / Môn Học (Pastel Tokens)
            </h2>
          </div>
          <p className="text-sm text-muted">
            Mỗi lớp hoặc môn được gán 1 màu cố định giúp giáo viên và học sinh
            nhận diện tức thì.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CLASS_COLORS.map((c) => (
              <div
                key={c.name}
                className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground capitalize">
                      {c.name}
                    </h3>
                    <p className="text-xs text-muted">{c.label}</p>
                  </div>
                  <ClassChip color={c.name}>{c.name.toUpperCase()}</ClassChip>
                </div>

                {/* Swatch Demo Tile */}
                <div
                  className={`rounded-tile p-4 flex items-center justify-between bg-class-${c.name}-bg text-class-${c.name}-fg transition-colors`}
                >
                  <div>
                    <div className="font-extrabold text-base">{c.desc}</div>
                    <div className="text-xs font-medium">{c.label}</div>
                  </div>
                  <div className="font-mono text-xl font-black">10A1</div>
                </div>

                <div className="text-[11px] font-mono text-muted space-y-0.5">
                  <div>Nền: var(--class-{c.name}-bg)</div>
                  <div>Chữ: var(--class-{c.name}-fg)</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Typography Scale */}
        <section id="typography" className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Type className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              3. Thang Phông Chữ (Typography Scale)
            </h2>
          </div>
          <p className="text-sm text-muted">
            Phông chữ chính: <strong>Plus Jakarta Sans</strong> (hỗ trợ đầy đủ tiếng
            Việt). Phông mã/phím tắt: <strong>IBM Plex Mono</strong>.
          </p>

          <div className="rounded-card border border-border bg-surface p-6 space-y-6 shrink-0">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">64px · Hero Stat</span>
                <span className="text-6xl font-extrabold tracking-tight tabular-nums text-foreground">
                  17
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">36px · Display</span>
                <span className="text-4xl font-extrabold tracking-tight text-foreground">
                  Chào buổi sáng, cô Hà
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">28px · Page Title</span>
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  Bài tập Hàm số bậc hai
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">22px · Section Header</span>
                <span className="text-xl font-bold text-foreground">
                  Danh sách nộp bài lớp 10A1
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">18px · Card Header</span>
                <span className="text-lg font-semibold text-foreground">
                  Tỉ lệ nộp tuần này
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">16px · Base / Subheader</span>
                <span className="text-base font-semibold text-foreground">
                  Phiếu học tập Vectơ trong mặt phẳng
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">14px · Body text</span>
                <span className="text-sm text-foreground leading-relaxed">
                  Học sinh làm bài ra giấy kiểm tra, chụp ảnh bài làm và gửi kèm nhận xét trước hạn nộp.
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/40 pb-3 gap-2">
                <span className="font-mono text-xs text-muted">13px · Secondary</span>
                <span className="text-[13px] text-muted">
                  Thứ Hai, 29 tháng 9 · Tuần 4 học kỳ I
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between pb-1 gap-2">
                <span className="font-mono text-xs text-muted">12px · Caption / Chip</span>
                <span className="text-xs text-muted">
                  Còn 2 ngày 5 giờ · Điểm số: 8,5
                </span>
              </div>
            </div>

            {/* Mono font sample */}
            <div className="rounded-control bg-surface-2 p-4 space-y-2 border border-border/60">
              <div className="text-xs font-semibold text-foreground">
                IBM Plex Mono (Phím tắt và Mã định danh):
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <kbd className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs font-semibold text-foreground">
                  ⌘K
                </kbd>
                <kbd className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs font-semibold text-foreground">
                  Ctrl + Enter
                </kbd>
                <kbd className="rounded border border-border bg-surface px-2 py-1 font-mono text-xs font-semibold text-foreground">
                  J / K
                </kbd>
                <span className="font-mono text-xs font-bold text-primary">
                  CLASS-CODE: MATH10-2026
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Shadcn Components */}
        <section id="shadcn" className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <LayoutGrid className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              4. Toàn Bộ Shadcn UI Components
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Buttons */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Button (Các biến thể và kích thước)
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="default">Default Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link Button</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Button size="sm">Nhỏ (sm)</Button>
                <Button size="default">Vừa (default)</Button>
                <Button size="lg">Lớn (lg)</Button>
                <Button size="icon" aria-label="Icon plus">
                  <Plus className="size-4" />
                </Button>
                <Button disabled>Vô hiệu hóa</Button>
              </div>
            </div>

            {/* Inputs & Form Controls */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Input, Label, Input có lỗi
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-normal">Tên bài tập</Label>
                  <Input
                    id="demo-normal"
                    placeholder="Ví dụ: Ôn tập chương 1..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="demo-error">
                    Mã bảo mật (thử nhập dưới 5 ký tự để thấy lỗi)
                  </Label>
                  <Input
                    id="demo-error"
                    value={demoInput}
                    onChange={(e) => setDemoInput(e.target.value)}
                    placeholder="Nhập mã xác thực..."
                    aria-invalid={isInputError}
                    className={
                      isInputError
                        ? "border-danger focus-visible:ring-danger"
                        : ""
                    }
                  />
                  {isInputError && (
                    <p className="text-xs font-semibold text-danger flex items-center gap-1">
                      <XCircle className="size-3.5 shrink-0" />
                      Mã bài tập cần tối thiểu 5 ký tự
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Select & Textarea */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Select & Textarea
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dev-select-class">Chọn lớp giảng dạy</Label>
                  <Select defaultValue="10A1">
                    <SelectTrigger id="dev-select-class" className="w-full">
                      <SelectValue placeholder="Chọn lớp..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10A1">Lớp 10A1 (Chuyên Toán)</SelectItem>
                      <SelectItem value="10A2">Lớp 10A2 (Đại trà)</SelectItem>
                      <SelectItem value="11B3">Lớp 11B3 (Tự nhiên)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="demo-note">Nhận xét bài làm</Label>
                  <Textarea
                    id="demo-note"
                    rows={2}
                    placeholder="Nhập nhận xét của giáo viên..."
                    defaultValue="Đồ thị bài 3 vẽ đúng và đẹp. Cần ghi rõ trục đối xứng x = 2 nhé."
                  />
                </div>
              </div>
            </div>

            {/* Tabs & Tooltip & Dropdown */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Tabs, DropdownMenu & Tooltip
              </h3>
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="pending" className="flex-1">
                    Chờ chấm (14)
                  </TabsTrigger>
                  <TabsTrigger value="graded" className="flex-1">
                    Đã chấm (12)
                  </TabsTrigger>
                  <TabsTrigger value="missing" className="flex-1">
                    Chưa nộp (9)
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="pending"
                  className="rounded-lg border border-border/50 p-3 text-xs text-muted"
                >
                  Có 14 bài nộp đang chờ cô Hà chấm điểm.
                </TabsContent>
                <TabsContent
                  value="graded"
                  className="rounded-lg border border-border/50 p-3 text-xs text-muted"
                >
                  12 bài đã hoàn tất chấm điểm và nhận xét.
                </TabsContent>
                <TabsContent
                  value="missing"
                  className="rounded-lg border border-border/50 p-3 text-xs text-muted"
                >
                  9 học sinh chưa nộp bài.
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-3 pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="mr-1.5 size-4" />
                      Thao tác bài tập
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Tùy chọn</DropdownMenuLabel>
                    <DropdownMenuItem>Chỉnh sửa đề bài</DropdownMenuItem>
                    <DropdownMenuItem>Sao chép liên kết nộp</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-danger">
                      Lưu trữ bài tập
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="secondary" size="sm">
                        Hover xem Tooltip
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Phím tắt chấm bài: J / K để chuyển học sinh
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Dialog, Alert Dialog & Sheet */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Dialog, AlertDialog & Sheet
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Mở Dialog mẫu</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tạo bài tập mới</DialogTitle>
                      <DialogDescription>
                        Điền tiêu đề và hạn nộp để gửi thông báo tới học sinh.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <Label htmlFor="dlg-title">Tiêu đề bài</Label>
                      <Input
                        id="dlg-title"
                        defaultValue="Đề kiểm tra giữa kỳ 1"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="default">Tạo bài tập</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* AlertDialog */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Mở AlertDialog</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận trả điểm?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Học sinh sẽ nhận được điểm và nhận xét ngay sau khi trả
                        bài. Thao tác này không thể hoàn tác.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction>Trả bài ngay</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Mở Sheet Drawer</Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Bộ lọc danh sách bài tập</SheetTitle>
                      <SheetDescription>
                        Lọc theo trạng thái và thời gian nộp bài.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 py-4 text-xs text-muted">
                      <p>Nội dung cấu hình bộ lọc chi tiết cho giáo viên.</p>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Skeleton & Avatars & Toasts */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Skeleton, Toast Thông Báo (Sonner) & Avatar
              </h3>

              {/* Skeleton Showcase */}
              <div className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/3 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </div>
                <Skeleton className="h-7 w-16 rounded-full shrink-0" />
              </div>

              {/* Toast Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.success("Đã lưu điểm 8,5 thành công!", {
                      description: "Học sinh: Lê Hoàng Anh (10A1)",
                    })
                  }
                >
                  Toast Success
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.error("Không thể tải lên ảnh!", {
                      description: "Dung lượng vượt quá giới hạn 10MB.",
                    })
                  }
                >
                  Toast Error
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.info("Đã gửi thông báo nhắc hạn nộp bài.", {
                      description: "Còn 9 học sinh chưa nộp.",
                    })
                  }
                >
                  Toast Info
                </Button>
              </div>

              {/* Avatars */}
              <div className="flex items-center gap-3 pt-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary-soft text-primary font-bold text-xs">
                    LA
                  </AvatarFallback>
                </Avatar>
                <Avatar className="size-10">
                  <AvatarFallback className="bg-success-soft text-success font-bold text-xs">
                    NH
                  </AvatarFallback>
                </Avatar>
                <Avatar className="size-12">
                  <AvatarFallback className="bg-warning-soft text-warning font-bold text-sm">
                    MK
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted">
                  Avatar kích thước 32px, 40px, 48px
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Domain Components */}
        <section id="domain" className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              5. Component Domain Dùng Lại
            </h2>
          </div>

          <div className="space-y-6">
            {/* 7 SubmissionStatusBadge */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-3 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                7 Trạng Thái Bài Nộp (SubmissionStatusBadge)
              </h3>
              <div className="flex flex-wrap items-center gap-2.5">
                {SUBMISSION_STATUSES.map((status) => (
                  <SubmissionStatusBadge key={status} status={status} />
                ))}
              </div>
            </div>

            {/* DeadlineChips */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-3 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Hạn Nộp Thông Minh (DeadlineChip)
              </h3>
              <p className="text-xs text-muted">
                Tính toán thời gian tương đối dựa trên prop `now`.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <DeadlineChip
                  dueDate={new Date("2026-09-26T10:00:00Z")}
                  now={new Date("2026-09-28T10:00:00Z")}
                />
                <DeadlineChip
                  dueDate={new Date("2026-09-28T15:30:00Z")}
                  now={new Date("2026-09-28T10:00:00Z")}
                />
                <DeadlineChip
                  dueDate={new Date("2026-09-29T15:00:00Z")}
                  now={new Date("2026-09-28T10:00:00Z")}
                />
                <DeadlineChip
                  dueDate={new Date("2026-10-02T10:00:00Z")}
                  now={new Date("2026-09-28T10:00:00Z")}
                />
              </div>
            </div>

            {/* SegmentedProgress */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-4 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Thanh Tiến Độ 4 Đoạn (SegmentedProgress)
              </h3>
              <p className="text-xs text-muted">
                Tương ứng: Đã chấm (foreground) / Chờ chấm (primary) / Nộp trễ (late-bar) / Chưa nộp (surface-2).
              </p>
              <div className="space-y-4 max-w-2xl">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold">
                    <span>Bài tập Hàm số bậc hai · 10A1</span>
                    <span className="text-muted tabular-nums">29 / 38 học sinh</span>
                  </div>
                  <SegmentedProgress
                    graded={12}
                    pending={14}
                    late={3}
                    missing={9}
                    total={38}
                    showLegend={true}
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold">
                    <span>Quiz: Mệnh đề và tập hợp · 10A2</span>
                    <span className="text-muted tabular-nums">34 / 36 học sinh</span>
                  </div>
                  <SegmentedProgress
                    graded={34}
                    pending={0}
                    late={0}
                    missing={2}
                    total={36}
                    showLegend={false}
                  />
                </div>
              </div>
            </div>

            {/* StatTile default vs hero */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatTile
                label="Tổng số học sinh"
                value="132"
                description="Phân bổ trong 4 lớp học kỳ I"
              />
              <StatTile
                variant="hero"
                label="Cần chấm"
                value="17"
                description="bài đang chờ cô · lâu nhất 2 ngày"
                badge={
                  <span className="rounded-full bg-on-primary px-2.5 py-0.5 text-xs font-bold text-primary">
                    3 lớp
                  </span>
                }
                action={
                  <Button
                    variant="secondary"
                    className="w-full justify-between"
                  >
                    <span>Bắt đầu chấm</span>
                    <ChevronRight className="size-4" />
                  </Button>
                }
              />
            </div>
          </div>
        </section>

        {/* Section 6: Bento Mockup D */}
        <section id="bento-d" className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="size-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                6. Bản Thu Nhỏ Bento &quot;Tổng Quan GV&quot; (Mockup D)
              </h2>
            </div>
            <Link
              href="/teacher"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Mở trang /teacher
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          {/* Mini Bento 12-cols layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            {/* Tile 1: Hero Cần chấm (span 4) */}
            <div className="rounded-card bg-primary p-6 text-on-primary shadow-primary flex flex-col justify-between lg:col-span-4 shrink-0">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-wide text-on-primary">
                    Cần chấm
                  </h3>
                  <span className="rounded-full bg-on-primary px-2.5 py-0.5 text-xs font-bold text-primary">
                    3 lớp
                  </span>
                </div>
                <div className="my-2 font-extrabold text-5xl tracking-tight tabular-nums text-on-primary">
                  17
                </div>
                <div className="text-xs text-on-primary font-medium">
                  bài đang chờ cô · lâu nhất 2 ngày
                </div>

                {/* Avatar stack */}
                <div className="mt-4 flex items-center gap-1.5">
                  <div className="flex -space-x-2 overflow-hidden">
                    {["LA", "NB", "TG", "ĐT", "QV"].map((initials, idx) => (
                      <Avatar
                        key={idx}
                        className="size-7 border-2 border-primary bg-surface text-foreground font-bold text-[10px]"
                      >
                        <AvatarFallback className="bg-surface text-foreground font-bold text-[10px]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-on-primary pl-1">
                    +12 bài khác
                  </span>
                </div>
              </div>

              <Link
                href="/teacher"
                className="mt-6 inline-flex w-full items-center justify-between rounded-control bg-surface px-4 py-2.5 text-xs font-bold text-foreground shadow-xs hover:bg-surface-2 transition-colors"
              >
                <span>Bắt đầu chấm</span>
                <ChevronRight className="size-4" />
              </Link>
            </div>

            {/* Tile 2: Tỉ lệ nộp tuần này (span 3) */}
            <div className="rounded-card border border-border bg-surface p-5 flex flex-col justify-between lg:col-span-3 shrink-0">
              <h3 className="font-bold text-sm text-foreground">
                Tỉ lệ nộp tuần này
              </h3>

              <div className="my-3 flex flex-col items-center">
                {/* SVG Donut without hardcoded colors */}
                <div className="relative size-28">
                  <svg
                    className="size-full -rotate-90"
                    viewBox="0 0 120 120"
                    aria-hidden="true"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      strokeWidth="14"
                      className="stroke-surface-2"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      strokeWidth="14"
                      strokeDasharray="202.3 289"
                      strokeLinecap="round"
                      className="stroke-success"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      strokeWidth="14"
                      strokeDasharray="28.9 289"
                      strokeDashoffset="-208"
                      strokeLinecap="round"
                      className="stroke-late-bar"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-extrabold text-2xl tracking-tight text-foreground tabular-nums">
                      82%
                    </span>
                    <span className="text-[10px] text-muted font-medium">
                      đã nộp
                    </span>
                  </div>
                </div>

                <div className="mt-3 w-full space-y-1 text-xs">
                  <div className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-success" />
                      Đúng hạn
                    </span>
                    <b className="text-foreground">70%</b>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-late-bar" />
                      Nộp trễ
                    </span>
                    <b className="text-foreground">12%</b>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-xs bg-surface-2 border border-border" />
                      Chưa nộp
                    </span>
                    <b className="text-foreground">18%</b>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold text-success">
                ↑ 6% so với tuần trước
              </div>
            </div>

            {/* Tile 3: Lịch hạn nộp tuần này (span 5) */}
            <div className="rounded-card border border-border bg-surface p-5 flex flex-col justify-between lg:col-span-5 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">
                  Lịch hạn nộp
                </h3>
                <span className="text-xs text-muted">Tháng 9 – 10</span>
              </div>

              {/* 7 Days Grid */}
              <div className="my-3 grid grid-cols-7 gap-1">
                {[
                  { d: "T2", n: "29", active: true },
                  { d: "T3", n: "30", dot: "peach" },
                  { d: "T4", n: "1" },
                  { d: "T5", n: "2", dot: "sky" },
                  { d: "T6", n: "3" },
                  { d: "T7", n: "4" },
                  { d: "CN", n: "5", dot: "lilac" },
                ].map((day, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center rounded-lg py-2 text-center text-xs transition-colors ${
                      day.active
                        ? "bg-primary text-on-primary font-bold shadow-xs"
                        : "bg-surface-2 text-foreground font-medium"
                    }`}
                  >
                    <span className="text-[10px] font-medium">{day.d}</span>
                    <b className="text-sm tabular-nums">{day.n}</b>
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full">
                      {day.dot === "peach" && (
                        <span className="block size-1.5 rounded-full bg-class-peach-fg" />
                      )}
                      {day.dot === "sky" && (
                        <span className="block size-1.5 rounded-full bg-class-sky-fg" />
                      )}
                      {day.dot === "lilac" && (
                        <span className="block size-1.5 rounded-full bg-class-lilac-fg" />
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* 2 Deadline Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-class-peach-fg" />
                    <div>
                      <div className="font-bold text-foreground">
                        Hàm số bậc hai
                      </div>
                      <div className="text-[11px] text-muted">
                        10A1 · Thứ Ba 23:59
                      </div>
                    </div>
                  </div>
                  <ClassChip color="peach">9 chưa nộp</ClassChip>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-class-sky-fg" />
                    <div>
                      <div className="font-bold text-foreground">
                        Phiếu học tập Vectơ
                      </div>
                      <div className="text-[11px] text-muted">
                        11B3 · Thứ Năm 23:59
                      </div>
                    </div>
                  </div>
                  <ClassChip color="sky">32 chưa nộp</ClassChip>
                </div>
              </div>
            </div>

            {/* Tile 4: Tiến độ bài tập (span 7) */}
            <div className="rounded-card border border-border bg-surface p-5 lg:col-span-7 shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">
                  Tiến độ bài tập
                </h3>
                <span className="text-xs text-muted cursor-pointer hover:underline">
                  Xem tất cả
                </span>
              </div>

              <div className="space-y-3">
                {[
                  {
                    color: "sky" as ClassColor,
                    cls: "10A1",
                    title: "Bài tập Hàm số bậc hai",
                    sub: "Tự luận · hạn 30/09",
                    total: 38,
                    graded: 12,
                    pending: 14,
                    late: 3,
                    missing: 9,
                  },
                  {
                    color: "mint" as ClassColor,
                    cls: "10A2",
                    title: "Quiz: Mệnh đề và tập hợp",
                    sub: "Trắc nghiệm · tự chấm",
                    total: 36,
                    graded: 34,
                    pending: 0,
                    late: 0,
                    missing: 2,
                  },
                  {
                    color: "peach" as ClassColor,
                    cls: "11B3",
                    title: "Phiếu học tập Vectơ",
                    sub: "Tự luận · hạn 02/10",
                    total: 40,
                    graded: 0,
                    pending: 8,
                    late: 0,
                    missing: 32,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-border/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ClassChip color={item.color}>{item.cls}</ClassChip>
                        <div className="truncate">
                          <div className="truncate font-bold text-xs text-foreground">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-muted">
                            {item.sub}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs shrink-0">
                        <b className="tabular-nums text-foreground">
                          {item.graded + item.pending + item.late}/{item.total}
                        </b>
                        <div className="text-[10px] text-muted">
                          {item.pending > 0
                            ? `${item.pending} chờ chấm`
                            : "hoàn tất"}
                        </div>
                      </div>
                    </div>
                    <SegmentedProgress
                      graded={item.graded}
                      pending={item.pending}
                      late={item.late}
                      missing={item.missing}
                      total={item.total}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Tile 5: Lớp học pastel (span 5) */}
            <div className="rounded-card border border-border bg-surface p-5 lg:col-span-5 shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Lớp học</h3>
                <span className="text-xs text-muted">4 lớp · 132 học sinh</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    name: "10A1",
                    color: "sky" as ClassColor,
                    sub: "Toán · 2 bài mở",
                    count: 38,
                  },
                  {
                    name: "10A2",
                    color: "mint" as ClassColor,
                    sub: "Toán · 1 bài mở",
                    count: 36,
                  },
                  {
                    name: "11B3",
                    color: "peach" as ClassColor,
                    sub: "Toán · 1 bài mở",
                    count: 40,
                  },
                  {
                    name: "CLB",
                    color: "lilac" as ClassColor,
                    sub: "Nâng cao · 1 bài mở",
                    count: 18,
                  },
                ].map((c) => (
                  <div
                    key={c.name}
                    className={`flex flex-col justify-between rounded-tile p-3.5 bg-class-${c.color}-bg text-class-${c.color}-fg transition-transform hover:scale-[1.02]`}
                  >
                    <div>
                      <div className="font-extrabold text-base">{c.name}</div>
                      <div className="text-[11px] font-medium">{c.sub}</div>
                    </div>
                    <div className="mt-3 text-right">
                      <span className="text-xl font-extrabold tabular-nums">
                        {c.count}
                      </span>
                      <span className="ml-1 text-[10px] uppercase font-bold">
                        HS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
