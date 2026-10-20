"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Tv,
  UploadCloud,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Video } from "@/types";
import { VideoCard } from "@/components/syllabus/VideoCard";

interface AIUnit {
  number: number;
  title: string;
  tagline: string;
  topics: string[];
  description: string;
}

const AI_CURRICULUM_UNITS: AIUnit[] = [
  {
    number: 1,
    title: "Foundational Math & Statistics for ML",
    tagline: "Linear Algebra, Multivariable Calculus & Probability",
    topics: [
      "Vector Spaces & Matrices",
      "Eigenvalues & SVD Decomposition",
      "Gradient Descent & Jacobians/Hessians",
      "Probability Distributions (Gaussian, Bernoulli)",
      "Maximum Likelihood Estimation (MLE)",
      "Information Theory & Cross-Entropy",
    ],
    description:
      "Core mathematical underpinnings of machine learning algorithms: vector projections, matrix factorization, convex optimization, and Bayesian statistical formulation.",
  },
  {
    number: 2,
    title: "Deep Learning & Neural Architectures",
    tagline: "Backprop, Optimization, CNNs & RNNs",
    topics: [
      "Computation Graphs & Automatic Differentiation",
      "Backpropagation Derivation",
      "Optimizers (AdamW, RMSprop, SGD with Momentum)",
      "Convolutional Networks & Feature Hierarchies",
      "Recurrent Networks & LSTM/GRU Gates",
      "Batch Normalization & LayerNorm",
    ],
    description:
      "Modern deep neural network paradigms: end-to-end gradient backpropagation, residual connections, convolutional representations, and sequence modeling.",
  },
  {
    number: 3,
    title: "Transformers & Attention Mechanisms",
    tagline: "Scaled Dot-Product, Multi-Head Attention & ViTs",
    topics: [
      "Query-Key-Value Self-Attention Formulation",
      "Multi-Head Attention Computation",
      "Rotary Positional Embeddings (RoPE)",
      "Transformer Encoder vs Decoder Architectures",
      "Vision Transformers (ViT) & Patch Embeddings",
      "FlashAttention & Memory-Efficient Kernels",
    ],
    description:
      "The foundational architecture behind modern generative AI: parallel attention calculation, contextual token representations, and KV caching.",
  },
  {
    number: 4,
    title: "Large Language Models & Fine-Tuning",
    tagline: "Pre-training, LoRA, RLHF & RAG Pipelines",
    topics: [
      "Byte-Pair Encoding (BPE) & Tokenization",
      "Causal Language Modeling & Pre-training",
      "Parameter-Efficient Fine-Tuning (LoRA, QLoRA)",
      "Instruction Tuning & Alignment (SFT, RLHF, DPO)",
      "Retrieval-Augmented Generation (RAG) Architecture",
      "Vector Embeddings & Cosine Search (pgvector)",
    ],
    description:
      "Production-grade LLM engineering: tokenization dynamics, low-rank parameter adaptation, preference alignment, and embedding-backed vector knowledge retrieval.",
  },
  {
    number: 5,
    title: "Generative AI, Computer Vision & MLOps",
    tagline: "Diffusion Models, Quantization & Low-Latency Serving",
    topics: [
      "Denoising Diffusion Probabilistic Models (DDPM)",
      "Latent Diffusion & Text-to-Image Conditioning",
      "Weight Quantization (INT8, FP4, AWQ, GPTQ)",
      "High-Throughput Inference Engines (vLLM, TensorRT)",
      "Model Monitoring & Drift Detection",
      "Kubernetes & Docker Deployment for ML",
    ],
    description:
      "Scaling generative models into real-world production: continuous batching with PagedAttention, hardware-accelerated quantization, and enterprise serving pipelines.",
  },
];

export default function AITrackPage() {
  const [activeUnitNumber, setActiveUnitNumber] = useState<number>(1);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAIVideos() {
      try {
        setLoading(true);
        const res = await apiClient
          .getUnitVideos("AI_GENERAL", activeUnitNumber)
          .catch(() => [] as Video[]);
        setVideos(res);
      } catch (err) {
        console.error("Failed to load AI Track videos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAIVideos();
  }, [activeUnitNumber]);

  const activeUnit =
    AI_CURRICULUM_UNITS.find((u) => u.number === activeUnitNumber) || AI_CURRICULUM_UNITS[0];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-surface-border bg-surface-dark p-8 sm:p-12 shadow-sm">
        <div className="relative max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-secondary/30 bg-brand-secondary/10 px-3.5 py-1 text-xs font-mono font-semibold text-brand-secondary">
            <Brain className="h-4 w-4 text-brand-secondary" />
            <span>AKTU Engineering • Specialized AI/ML Study Track</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary leading-tight font-heading">
            Production AI & Machine Learning{" "}
            <span className="text-brand-secondary">
              Curriculum.
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            A comprehensive, 5-unit foundational-to-production AI curriculum designed for B.Tech engineers. Free from YouTube recommendation distractions, focused entirely on mathematical rigour, transformer architectures, and scalable MLOps.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-text-secondary">
            <span className="flex items-center gap-1.5 text-brand-secondary font-semibold">
              <Zap className="h-4 w-4" /> Reserved Tag: AI_GENERAL
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="h-4 w-4" /> 5 Structured Units
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-brand-primary">
              <Sparkles className="h-4 w-4" /> Gemini AI Verified
            </span>
          </div>
        </div>
      </section>

      {/* 5-Unit Tabs Selection */}
      <div className="space-y-4">
        <div className="flex border-b border-surface-border overflow-x-auto gap-2 pb-1">
          {AI_CURRICULUM_UNITS.map((u) => {
            const isActive = activeUnitNumber === u.number;
            return (
              <button
                key={u.number}
                onClick={() => setActiveUnitNumber(u.number)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap font-mono ${
                  isActive
                    ? "bg-brand-primary text-background-dark font-bold shadow-solar-glow"
                    : "bg-surface-dark border border-surface-border text-text-secondary hover:text-text-primary hover:bg-surface-border"
                }`}
              >
                <span className="rounded-md bg-background-dark px-2 py-0.5 font-mono text-[11px] text-brand-secondary">
                  Unit {u.number}
                </span>
                <span>{u.title}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Unit Overview Card */}
        <div className="rounded-2xl border border-surface-border bg-surface-dark p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-secondary/10 border border-brand-secondary/20 px-3 py-1 text-xs font-mono font-semibold text-brand-secondary mb-2">
                <span>Unit {activeUnit.number}: {activeUnit.tagline}</span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary font-heading tracking-tight">{activeUnit.title}</h2>
            </div>
            <span className="self-start rounded-full bg-surface-dark border border-surface-border px-3 py-1 text-xs font-mono text-text-secondary">
              AKTU AI Specialization
            </span>
          </div>

          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-4xl">
            {activeUnit.description}
          </p>

          {/* Core Topics Checklist */}
          <div className="space-y-2 pt-2 border-t border-surface-border/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-secondary block">
              Core Syllabus Topics & Mathematical Formulations:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeUnit.topics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl bg-background-dark border border-surface-border p-3 text-xs text-text-secondary hover:text-text-primary hover:border-brand-secondary/40 transition-all font-mono"
                >
                  <Cpu className="h-3.5 w-3.5 text-brand-secondary shrink-0" />
                  <span className="font-medium">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Videos List for this AI Unit */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 font-heading">
            <Tv className="h-5 w-5 text-brand-primary" />
            <span>Unit {activeUnitNumber} Curated AI Lectures</span>
            <span className="text-xs font-mono font-normal text-text-secondary">({videos.length} videos)</span>
          </h3>

          <Link
            href="/upload"
            className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-dark px-3 py-1.5 text-xs font-mono font-semibold text-success hover:border-success/40 transition-colors"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload AI Lecture MP4
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {videos.map((vid) => (
              <VideoCard key={vid.id} video={vid} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-border bg-surface-dark/40 p-10 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-dark border border-surface-border text-brand-primary">
              <Brain className="h-6 w-6 text-brand-primary" />
            </div>
            <h4 className="text-sm font-bold text-text-primary font-heading">
              Unit {activeUnitNumber} Lectures Queued
            </h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto leading-relaxed">
              Our automated quota-efficient scraper is indexing top verified university AI lectures. You can also directly contribute peer notes or MP4 walkthroughs.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/upload"
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-background-dark shadow-solar-glow hover:bg-brand-primary/90 transition-all"
              >
                Submit Lecture for Unit {activeUnitNumber}
              </Link>
              <Link
                href="/admin/ingestion"
                className="rounded-xl border border-surface-border bg-surface-dark px-4 py-2 text-xs font-mono text-text-secondary hover:text-text-primary"
              >
                Open Ingestion Hub
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
