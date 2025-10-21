"use client";

import { useRef, useState } from "react";
import { searchWeb } from "@/app/actions";
import { WaitlistForm } from "@/components/waitlist-form";
import { Button } from "@/components/ui/button";

export default function SumSnapLanding() {
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [demoUrl, setDemoUrl] = useState("");

  // Chatbot state
  const systemPrompt = `당신은 SumSnap Landing Template(v0.1.0)의 프로젝트 안내 챗봇입니다. 모든 답변은 한국어로 간결하고 정확하게 제공합니다.

프로젝트 개요:
- Next.js 14.2.16(App Router), React 18, TypeScript 5
- Tailwind CSS 4.1.9, Radix UI, Lucide, Geist
- 단일 랜딩 페이지 구조, 우측 하단 플로팅 챗봇

핵심 파일 경로:
- app/page.tsx: 메인 랜딩/챗봇 UI(플로팅 버튼, 패널, 스트리밍 소비)
- app/api/chat/route.ts: Google AI Studio Gemini 2.5 Flash 스트리밍 엔드포인트
- app/actions.ts: Notion 서버 액션 submitToWaitlist(FormData → Notion Pages)
- components/waitlist-form.tsx: 웨이팅 리스트 폼(UI → submitToWaitlist 호출)
- components/ui/*: 재사용 UI 컴포넌트들
- hooks/use-toast.ts, hooks/use-mobile.ts: 커스텀 훅
- styles/globals.css, app/globals.css: 전역 스타일

환경 변수:
- GEMINI_API_KEY: Google AI Studio 키(서버에서만 사용)
- NOTION_API_KEY, NOTION_DATABASE_ID: 웨이팅 리스트 저장용 Notion 설정

로그 정책:
- 클라이언트: [chat-ui] 접두사로 전송/완료/중단/에러를 콘솔에 기록
- 서버: [chat] 접두사로 요청 시작/스트림 시작·종료/에러를 기록

가이드라인:
- 파일/코드 참조 시 경로를 백틱으로 표기(예: \`app/page.tsx\`).
- 프로젝트 범위 밖 정보는 추측하지 말고 “프로젝트에 포함된 정보가 아닙니다”라고 답변.
- 민감정보(키/토큰)는 절대 출력하지 않음.
- 필요한 경우 간단한 코드 예시는 제공하되, 이 프로젝트의 아키텍처/규칙을 따름.`;
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "model"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function sendMessage() {
    if (!chatInput.trim() || isStreaming) return;
    const raw = chatInput.trim();
    const isWeb = raw.startsWith("/web ");
    const query = isWeb ? raw.slice(5).trim() : raw;
    const userMsg = { role: "user" as const, content: query };
    const history = [...chatMessages, userMsg];
    setChatMessages(history);
    setChatInput("");
    setStreamingText("");
    setIsStreaming(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    console.log("[chat-ui] send start", {
      length: userMsg.content.length,
      historyCount: history.length,
      web: isWeb,
    });
    try {
      let effectiveSystemPrompt = systemPrompt;

      if (isWeb) {
        console.log("[chat-ui] search start", { qlen: query.length });
        const r = await searchWeb(query);
        if (!r?.ok) {
          console.error("[chat-ui] search fail", r?.error);
          setIsStreaming(false);
          setChatMessages((prev) => [
            ...prev,
            {
              role: "model",
              content: "웹 검색 실패. 잠시 후 다시 시도해 주세요.",
            },
          ]);
          return;
        }
        const items = (r.data?.results ?? []).slice(0, 3);
        const webContext = items
          .map((it: any, i: number) => {
            const title = it?.title ?? "(제목 없음)";
            const url = it?.url ?? "";
            const content = (it?.content ?? it?.snippet ?? "")
              .toString()
              .slice(0, 500);
            return `${i + 1}. ${title}\nURL: ${url}\n요약: ${content}`;
          })
          .join("\n\n");
        console.log("[chat-ui] search done", { count: items.length });
        effectiveSystemPrompt = `${systemPrompt}\n\n[웹 검색 컨텍스트]\n${webContext}\n\n지침: 위 컨텍스트와 프로젝트 지식을 바탕으로, 최신 사실을 우선하여 간결한 한국어 답변을 생성하고, 답변 하단에 출처 URL을 함께 제시하세요.`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          systemPrompt: effectiveSystemPrompt,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${text}`);
      }
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let bytes = 0;
      // stream loop
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) bytes += value.byteLength;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setStreamingText(acc);
      }
      setStreamingText("");
      setChatMessages((prev) => [...prev, { role: "model", content: acc }]);
      console.log("[chat-ui] stream complete", { bytes });
    } catch (e) {
      console.error("[chat-ui] send error", e);
    } finally {
      setIsStreaming(false);
      console.log("[chat-ui] send end");
    }
  }

  function stopStreaming() {
    if (isStreaming) {
      console.log("[chat-ui] stop requested");
      abortRef.current?.abort();
      setIsStreaming(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                S
              </span>
            </div>
            <span className="text-xl font-bold text-foreground font-yangjin">
              SumSnap
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-yangjin">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              기능
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              요금제
            </a>
            <a
              href="#faq"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </div>
          <Button
            onClick={() => setShowWaitlistForm(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold font-yangjin"
          >
            시작하기
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <span className="text-primary text-sm font-medium">
              AI 기반 콘텐츠 요약
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance leading-tight font-yangjin">
            모든 콘텐츠,
            <br />
            <span className="text-primary">단 10초 요약</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto text-pretty leading-relaxed font-yangjin">
            링크, 문서, 영상까지 AI가 핵심만 추출해 드립니다.
            <br />
            시간은 절약하고, 정보는 더 많이.
          </p>
          <div className="flex justify-center items-center">
            <Button
              onClick={() => setShowWaitlistForm(true)}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg px-8 py-6 glow-mint-strong font-yangjin"
            >
              지금 요약해보기
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-2xl">
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4 font-yangjin">
                요약 예시
              </h3>
              <p className="text-muted-foreground font-yangjin">
                YouTube 영상 링크를 입력하면 이렇게 요약됩니다
              </p>
            </div>

            {/* Interactive Input */}
            <div className="mb-8 p-4 bg-secondary rounded-lg border border-border flex items-center gap-3">
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && demoUrl) {
                    alert(
                      "요약 기능은 곧 출시됩니다! 웨이팅 리스트에 등록해주세요."
                    );
                    setShowWaitlistForm(true);
                  }
                }}
                placeholder="https://youtube.com/watch?v=example"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                onClick={() => {
                  if (demoUrl) {
                    alert(
                      "요약 기능은 곧 출시됩니다! 웨이팅 리스트에 등록해주세요."
                    );
                    setShowWaitlistForm(true);
                  }
                }}
                disabled={!demoUrl}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-yangjin"
              >
                요약하기
              </Button>
            </div>

            {/* Mock Summary Result */}
            <div className="space-y-4">
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 font-yangjin">
                      핵심 요약
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      AI 기술의 발전으로 콘텐츠 제작 시간이 90% 단축되었으며,
                      특히 텍스트 요약 분야에서 혁신적인 성과를 보이고 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 font-yangjin">
                      주요 키워드
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {["AI 기술", "콘텐츠 제작", "자동화", "생산성"].map(
                        (keyword) => (
                          <span
                            key={keyword}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {keyword}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-2 font-yangjin">
                      타임라인
                    </h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex gap-3">
                        <span className="text-primary font-mono">00:30</span>
                        <span>AI 기술 소개</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-primary font-mono">02:15</span>
                        <span>실제 사용 사례</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-primary font-mono">05:40</span>
                        <span>미래 전망</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-yangjin">
              다양한 콘텐츠를 <span className="text-primary">한눈에</span>
            </h2>
            <p className="text-xl text-muted-foreground font-yangjin">
              어떤 형태의 콘텐츠든 SumSnap이 정리해드립니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📄",
                title: "문서 & 텍스트",
                description: "긴 문서도 핵심만 추출해 빠르게 파악하세요",
              },
              {
                icon: "🎥",
                title: "영상 콘텐츠",
                description: "YouTube 영상을 텍스트로 변환 후 요약합니다",
              },
              {
                icon: "🔗",
                title: "웹 링크",
                description: "뉴스, 블로그, 논문 등 모든 웹 콘텐츠 지원",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-foreground font-yangjin">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-yangjin">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-yangjin">
              이런 분들께 추천합니다
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "📊 직장인 & 마케터",
                description:
                  "리서치 자료와 리포트를 빠르게 정리하고 핵심만 파악하세요",
              },
              {
                title: "🎓 대학생 & 연구자",
                description:
                  "논문과 학습 자료를 효율적으로 요약하고 정리하세요",
              },
              {
                title: "✍️ 콘텐츠 크리에이터",
                description:
                  "다양한 소스를 빠르게 큐레이션하고 콘텐츠를 제작하세요",
              },
              {
                title: "💼 기획자 & 관리자",
                description: "회의록과 보고서를 자동으로 요약하고 공유하세요",
              },
            ].map((useCase, index) => (
              <div
                key={index}
                className="p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-all"
              >
                <h3 className="text-lg font-bold mb-2 text-foreground font-yangjin">
                  {useCase.title}
                </h3>
                <p className="text-muted-foreground font-yangjin">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-yangjin">
              합리적인 <span className="text-primary">가격</span>
            </h2>
            <p className="text-xl text-muted-foreground font-yangjin">
              필요에 맞는 플랜을 선택하세요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Free",
                price: "₩0",
                period: "/월",
                features: [
                  "하루 3회 요약",
                  "텍스트 & 링크만",
                  "기본 요약 스타일",
                  "이메일 지원",
                ],
                cta: "무료 시작",
                highlighted: false,
              },
              {
                name: "Pro",
                price: "₩9,900",
                period: "/월",
                features: [
                  "무제한 요약",
                  "영상 요약 포함",
                  "모든 요약 스타일",
                  "우선 지원",
                  "API 접근",
                ],
                cta: "지금 시작하기",
                highlighted: true,
              },
              {
                name: "Team",
                price: "₩29,000",
                period: "/월 (최대 5인)",
                features: [
                  "Pro 모든 기능",
                  "협업 폴더",
                  "요약 공유",
                  "팀 대시보드",
                  "전담 지원",
                ],
                cta: "팀으로 시작",
                highlighted: false,
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`p-8 rounded-2xl ${
                  plan.highlighted
                    ? "bg-primary/10 border-2 border-primary shadow-2xl shadow-primary/20 scale-105"
                    : "bg-card border border-border"
                }`}
              >
                <h3 className="text-2xl font-bold mb-2 text-foreground font-yangjin">
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-muted-foreground"
                    >
                      <svg
                        className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => setShowWaitlistForm(true)}
                  className={`w-full font-semibold font-yangjin ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 glow-mint-strong"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-yangjin">
              자주 묻는 질문
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "어떤 형식의 콘텐츠를 요약할 수 있나요?",
                a: "텍스트, PDF 문서, 웹 링크, YouTube 영상 등 다양한 형식을 지원합니다. 영상의 경우 음성을 텍스트로 변환한 후 요약합니다.",
              },
              {
                q: "요약 품질은 어떤가요?",
                a: "최신 AI 모델을 사용하여 핵심 내용을 정확하게 추출합니다. 사용자 피드백을 바탕으로 지속적으로 개선하고 있습니다.",
              },
              {
                q: "무료 플랜으로도 충분한가요?",
                a: "가벼운 사용에는 무료 플랜으로 충분합니다. 하루 3회 제한이 있으며, 더 많은 요약이 필요하다면 Pro 플랜을 추천드립니다.",
              },
              {
                q: "언제 출시되나요?",
                a: "현재 베타 테스트 중이며, 웨이팅 리스트에 등록하시면 출시 소식을 가장 먼저 받아보실 수 있습니다.",
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group p-6 bg-card border border-border rounded-xl hover:border-primary/50 transition-all"
              >
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between font-yangjin">
                  <span>{faq.q}</span>
                  <svg
                    className="w-5 h-5 text-primary transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <p className="mt-4 text-muted-foreground leading-relaxed font-yangjin">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 rounded-3xl animate-gradient">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance font-yangjin">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto font-yangjin">
              시간을 절약하고 정보를 효율적으로 관리하는 새로운 방법
            </p>
            <Button
              onClick={() => setShowWaitlistForm(true)}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg px-12 py-6 glow-mint-strong font-yangjin"
            >
              웨이팅 리스트 등록하기
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  S
                </span>
              </div>
              <span className="text-xl font-bold text-foreground font-yangjin">
                SumSnap
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground font-yangjin">
              <a href="#" className="hover:text-foreground transition-colors">
                이용약관
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                개인정보처리방침
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                문의하기
              </a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground font-yangjin">
            © 2025 SumSnap. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => {
            console.log("[chat-ui] open");
            setChatOpen(true);
          }}
          aria-label="챗봇 열기"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 transition-colors flex items-center justify-center border border-primary/30"
        >
          {/* chat icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        </button>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[22rem] md:w-[28rem] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-secondary/50 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">S</span>
              </div>
              <span className="font-semibold">SumSnap 챗봇</span>
            </div>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <button
                  onClick={stopStreaming}
                  className="text-xs px-2 py-1 rounded-md bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"
                >
                  중단
                </button>
              )}
              <button
                onClick={() => {
                  console.log("[chat-ui] close");
                  setChatOpen(false);
                }}
                aria-label="닫기"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-96 h-96 overflow-y-auto p-4 space-y-3 bg-background/60">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] rounded-xl px-3 py-2 bg-primary text-primary-foreground"
                    : "mr-auto max-w-[85%] rounded-xl px-3 py-2 bg-secondary text-foreground border border-border"
                }
              >
                {m.content}
              </div>
            ))}
            {isStreaming && (
              <div className="mr-auto max-w-[85%] rounded-xl px-3 py-2 bg-secondary text-foreground border border-border whitespace-pre-wrap">
                {streamingText || ""}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border bg-background/80">
            <div className="flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
                placeholder="메시지를 입력하세요"
                className="flex-1 bg-secondary/40 border border-border rounded-md px-3 py-2 text-sm focus:outline-none"
                aria-label="메시지 입력"
              />
              <button
                onClick={sendMessage}
                disabled={isStreaming || !chatInput.trim()}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
                aria-label="전송"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Form Modal */}
      {showWaitlistForm && (
        <WaitlistForm onClose={() => setShowWaitlistForm(false)} />
      )}
    </div>
  );
}
