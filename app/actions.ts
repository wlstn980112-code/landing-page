"use server";

export async function submitToWaitlist(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  // 입력값 검증
  if (!name || !email) {
    return {
      success: false,
      message: "이름과 이메일을 모두 입력해주세요.",
    };
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: "올바른 이메일 형식을 입력해주세요.",
    };
  }

  // 노션 API 연동
  const notionApiKey = process.env.NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID;

  if (!notionApiKey || !notionDatabaseId) {
    console.error("Notion API credentials not configured");
    return {
      success: false,
      message: "서버 설정 오류가 발생했습니다.",
    };
  }

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: notionDatabaseId },
        properties: {
          이름: {
            title: [
              {
                text: {
                  content: name,
                },
              },
            ],
          },
          이메일: {
            email: email,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Notion API error:", errorData);
      throw new Error(`Notion API error: ${response.status}`);
    }

    return {
      success: true,
      message: "🎉 웨이팅 리스트 등록 완료! 출시되면 가장 먼저 알려드릴게요.",
    };
  } catch (error) {
    console.error("Error submitting to waitlist:", error);
    return {
      success: false,
      message: "등록 중 오류가 발생했습니다. 다시 시도해주세요.",
    };
  }
}

export async function searchWeb(query: string) {
  const trimmed = (query || "").trim();
  if (!trimmed || trimmed.length < 2) {
    return { ok: false, error: "empty" } as const;
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("[search] missing TAVILY_API_KEY");
    return { ok: false, error: "config" } as const;
  }

  console.log("[search] start", { qlen: trimmed.length });
  try {
    // 1) Prefer POST. Include api_key in body for widest compatibility.
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Some deployments require header auth. Keep both body and header.
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        query: trimmed,
        max_results: 5,
        include_answer: true,
        search_depth: "advanced",
        api_key: apiKey,
      }),
      cache: "no-store",
    });

    let finalData: any | null = null;
    if (response.ok) {
      finalData = await response.json();
    } else {
      const text = await response.text();
      console.error("[search] http_error", response.status, text);
    }

    // 2) Fallback GET if POST failed
    if (!finalData) {
      const url = `https://api.tavily.com/search?q=${encodeURIComponent(
        trimmed
      )}&api_key=${encodeURIComponent(apiKey)}&max_results=5`;
      const getRes = await fetch(url, { cache: "no-store" });
      if (!getRes.ok) {
        const msg = await getRes.text();
        console.error("[search] get_http_error", getRes.status, msg);
        return { ok: false, error: "http_error" } as const;
      }
      finalData = await getRes.json();
    }

    const results = Array.isArray(finalData?.results) ? finalData.results : [];
    console.log("[search] done", { num: results.length });
    return { ok: true, data: finalData } as const;
  } catch (e) {
    console.error("[search] exception", e);
    return { ok: false, error: "exception" } as const;
  }
}
