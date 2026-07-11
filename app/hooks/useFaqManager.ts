import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  bulkCreateFaqs,
  createFaq,
  deleteFaq,
  fetchFaqs,
  updateFaq,
} from "../db/faq.db";
import {
  downloadCsvTemplate,
  isCsvFile,
  parseFaqCsv,
  type FaqItem,
} from "../utils/faq.utils";
import { isSupabaseConfigured } from "../utils/supabase.config";

interface UseFaqManagerOptions {
  shop: string | null;
  supabaseUrl: string;
  supabaseKey: string;
}

export function useFaqManager({
  shop,
  supabaseUrl,
  supabaseKey,
}: UseFaqManagerOptions) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const configMissing = !isSupabaseConfigured({
    url: supabaseUrl,
    publishableKey: supabaseKey,
  });

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkPreview, setBulkPreview] = useState<
    { question: string; answer: string }[] | null
  >(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [templateDownloaded, setTemplateDownloaded] = useState(false);

  useEffect(() => {
    if (configMissing || typeof window === "undefined") {
      setSupabase(null);
      return;
    }

    let cancelled = false;

    import("../utils/supabase.browser").then(({ createBrowserSupabaseClient }) => {
      if (!cancelled) {
        setSupabase(createBrowserSupabaseClient(supabaseUrl, supabaseKey));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [configMissing, supabaseUrl, supabaseKey]);

  const showSuccessBanner = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }, []);

  const loadFaqs = useCallback(async () => {
    if (!shop || !supabase) {
      if (!configMissing) {
        setIsLoading(true);
      } else {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const data = await fetchFaqs(supabase, shop);
      setFaqs(data);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load FAQs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [shop, supabase, configMissing]);

  useEffect(() => {
    loadFaqs();
  }, [loadFaqs]);

  const resetForm = useCallback(() => {
    setQuestion("");
    setAnswer("");
    setEditingId(null);
    setFormError("");
  }, []);

  const resetBulkUpload = useCallback(() => {
    setBulkPreview(null);
    setBulkError("");
    setSelectedFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!shop || !supabase) return;

    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();

    if (!trimmedQuestion || !trimmedAnswer) {
      setFormError("Both question and answer are required.");
      return;
    }

    setFormError("");
    setIsSaving(true);

    try {
      if (editingId) {
        const updated = await updateFaq(
          supabase,
          editingId,
          trimmedQuestion,
          trimmedAnswer,
        );
        setFaqs((prev) =>
          prev.map((faq) => (faq.id === editingId ? updated : faq)),
        );
        showSuccessBanner("FAQ updated");
      } else {
        const created = await createFaq(
          supabase,
          shop,
          trimmedQuestion,
          trimmedAnswer,
        );
        setFaqs((prev) => [...prev, created]);
        showSuccessBanner("FAQ added");
      }
      resetForm();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to save FAQ.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    shop,
    supabase,
    question,
    answer,
    editingId,
    resetForm,
    showSuccessBanner,
  ]);

  const handleEdit = useCallback((faq: FaqItem) => {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setFormError("");
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!supabase) return;

      setIsSaving(true);
      try {
        await deleteFaq(supabase, id);
        setFaqs((prev) => prev.filter((faq) => faq.id !== id));
        if (editingId === id) {
          resetForm();
        }
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to delete FAQ.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [supabase, editingId, resetForm],
  );

  const handleDownloadTemplate = useCallback(() => {
    downloadCsvTemplate();
    setTemplateDownloaded(true);
    setBulkError("");
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      setBulkPreview(null);
      setBulkError("");

      if (!file) {
        setSelectedFileName("");
        return;
      }

      if (!isCsvFile(file)) {
        setBulkError("Only CSV files (.csv) are allowed.");
        setSelectedFileName("");
        return;
      }

      setSelectedFileName(file.name);
      setBulkError("");

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const { rows, errors } = parseFaqCsv(text);

        if (errors.length > 0) {
          setBulkError(errors.join(" "));
          setBulkPreview(null);
          return;
        }

        setBulkPreview(rows);
      };
      reader.onerror = () => {
        setBulkError("Failed to read the file. Please try again.");
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleBulkImport = useCallback(async () => {
    if (!shop || !supabase || !bulkPreview?.length) return;

    setIsSaving(true);
    try {
      const imported = await bulkCreateFaqs(supabase, shop, bulkPreview);
      setFaqs((prev) => [...prev, ...imported]);
      showSuccessBanner(`${imported.length} FAQs imported successfully`);
      resetBulkUpload();
    } catch (error) {
      setBulkError(
        error instanceof Error ? error.message : "Failed to import FAQs.",
      );
    } finally {
      setIsSaving(false);
    }
  }, [shop, supabase, bulkPreview, showSuccessBanner, resetBulkUpload]);

  return {
    fileInputRef,
    configMissing,
    faqs,
    isLoading,
    isSaving,
    loadError,
    question,
    answer,
    editingId,
    showSuccess,
    successMessage,
    formError,
    bulkError,
    bulkPreview,
    selectedFileName,
    templateDownloaded,
    setShowSuccess,
    setLoadError,
    setBulkError,
    setQuestion,
    setAnswer,
    resetForm,
    resetBulkUpload,
    handleSave,
    handleEdit,
    handleDelete,
    handleDownloadTemplate,
    handleFileSelect,
    handleBulkImport,
  };
}
