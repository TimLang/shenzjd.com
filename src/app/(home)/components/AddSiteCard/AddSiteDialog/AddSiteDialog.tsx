"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { Site } from "@/types";
import { useSites } from "@/contexts/SitesContext";
import { UrlInput } from "./UrlInput";
import { SiteInfoForm } from "./SiteInfoForm";

// URL schema 验证
const urlSchema = z.string().url("请输入有效的URL");

interface AddDialogProps {
  activeCategory: string;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddSiteDialog({
  activeCategory,
  onSuccess,
  open,
  onOpenChange,
}: AddDialogProps) {
  const { addSite } = useSites();
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [siteInfo, setSiteInfo] = useState<Site | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleParse = useCallback(
    async (urlToCheck?: string) => {
      try {
        const urlToValidate = urlToCheck || link;
        urlSchema.parse(urlToValidate);
        setLoading(true);
        setError("");

        const response = await fetch("/api/parse-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: urlToValidate }),
        });

        if (!response.ok) {
          // 如果获取网站信息失败，创建一个基本的siteInfo对象
          setSiteInfo({
            id: Date.now().toString(),
            title: "",
            favicon: "",
            url: urlToValidate,
          });
          setEditedTitle("");
          setError("无法自动获取网站信息，请手动填写标题和图标");
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log("新增网站信息", data);
        setSiteInfo(data);
        setEditedTitle(data.title);
        setLoading(false);
      } catch (err) {
        // 如果发生错误，同样创建一个基本的siteInfo对象
        setSiteInfo({
          id: Date.now().toString(),
          title: "",
          favicon: "",
          url: link,
        });
        setEditedTitle("");
        setError(err instanceof Error ? err.message : "发生未知错误");
        setLoading(false);
      }
    },
    [link]
  );

  useEffect(() => {
    if (!open) return;

    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        try {
          urlSchema.parse(text);
          setLink(text);
          handleParse(text);
        } catch {
          console.log("剪贴板内容不是有效URL");
        }
      } catch (err) {
        console.log("无法访问剪贴板:", err);
      }
    };

    checkClipboard();
  }, [open, handleParse]);

  const handleConfirm = async () => {
    if (!siteInfo) return;

    try {
      setIsSubmitting(true);
      await addSite(activeCategory, {
        id: Date.now().toString(),
        title: editedTitle || siteInfo.title,
        favicon: siteInfo.favicon,
        url: siteInfo.url,
      });

      // 重置状态
      setLink("");
      setSiteInfo(null);
      setEditedTitle("");
      onOpenChange?.(false);

      // 调用成功回调函数
      onSuccess?.();
    } catch (error) {
      console.error("添加站点失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:cursor-pointer">
        <DialogHeader>
          <DialogTitle>添加</DialogTitle>
          <DialogDescription>添加一个新链接</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <UrlInput
            link={link}
            onLinkChange={setLink}
            onParse={handleParse}
            loading={loading}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          {siteInfo && (
            <SiteInfoForm
              siteInfo={siteInfo}
              editedTitle={editedTitle}
              onTitleChange={setEditedTitle}
              onFaviconChange={(favicon) =>
                setSiteInfo((prev) => (prev ? { ...prev, favicon } : null))
              }
              onSubmit={handleConfirm}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
