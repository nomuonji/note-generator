
import { GoogleGenAI, Type } from "@google/genai";
import { 
  KeywordGroup, 
  GeneratedArticle, 
  ThematicDirection,
  CompetitionLevel 
} from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Type definitions for the backend API response
interface KeywordVolumeData {
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  competitionLevel: "HIGH" | "LOW" | "MEDIUM" | "UNKNOWN_COMPETITION_LEVEL";
  lowTopOfPageBidMicros: string;
  highTopOfPageBidMicros: string;
  keywordText: string;
}

type KeywordApiResponse = Record<string, KeywordVolumeData | null>;

/**
 * Fetches real keyword data from the backend API, handling chunking for API limits.
 */
const fetchKeywordData = async (keywords: string[]): Promise<KeywordApiResponse> => {
    if (keywords.length === 0) {
        return {};
    }

    const API_URL = 'https://api-three-gilt-37.vercel.app/api/get-keyword-volumes';
    const CHUNK_SIZE = 20; // Google Ads API limit
    const chunks: string[][] = [];

    for (let i = 0; i < keywords.length; i += CHUNK_SIZE) {
        chunks.push(keywords.slice(i, i + CHUNK_SIZE));
    }

    try {
        const responses = await Promise.all(
            chunks.map(chunk =>
                fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        keywords: chunk,
                        options: {
                            languageConstant: '1005',
                            geoTargetConstants: ['2392'],
                            includeAdultKeywords: false,
                        },
                    }),
                })
            )
        );

        let combinedData: KeywordApiResponse = {};

        for (const res of responses) {
            if (!res.ok) {
                let errorBody = 'No additional information.';
                try {
                    const errorJson = await res.json();
                    errorBody = JSON.stringify(errorJson.error || errorJson);
                } catch (e) { /* Ignore if body is not json */ }
                throw new Error(`The backend server responded with an error: ${res.status}. Message: ${errorBody}`);
            }
            const data: KeywordApiResponse = await res.json();
            // Filter out null or non-object responses from the API
            const validData = Object.entries(data).reduce((acc, [key, value]) => {
                if (value && typeof value === 'object') {
                    acc[key] = value;
                }
                return acc;
            }, {} as KeywordApiResponse);
            combinedData = { ...combinedData, ...validData };
        }

        return combinedData;
    } catch (error) {
        console.error('Error fetching keyword data:', error);
        if (error instanceof Error) {
          throw new Error(`Could not retrieve keyword data. ${error.message}`);
        }
        throw new Error('An unexpected error occurred while fetching keyword data.');
    }
};

/**
 * Maps the string competition level from the API to the enum type.
 */
const mapCompetitionLevel = (level: string): CompetitionLevel => {
  const upperLevel = level?.toUpperCase();
  if (upperLevel === 'HIGH') return CompetitionLevel.HIGH;
  if (upperLevel === 'MEDIUM') return CompetitionLevel.MEDIUM;
  return CompetitionLevel.LOW;
};

export const generateThematicDirections = async (concept: string): Promise<ThematicDirection[]> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `ブログコンセプト: "${concept}"

    上記のブログコンセプトに基づき、コンテンツの軸となるテーマの方向性を10〜15個提案してください。
    多角的な視点から、できるだけ多様な選択肢を網羅するようにしてください。
    各テーマは、説明的な文章ではなく、簡潔で具体的なキーワードまたは短いフレーズにしてください。
    例えば、「初心者向けの始め方」や「節約術」、「おすすめツール」のように、端的で分かりやすい表現でお願いします。

    結果は "title" をキーに持つオブジェクトのJSON配列として返却してください。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "The title of the thematic direction." },
          },
          required: ["title"],
        },
      },
    },
  });

  const jsonStr = response.text.trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON for thematic directions:", jsonStr);
    throw new Error("Received invalid format for thematic directions.");
  }
};

export const generateContentStrategy = async (blogConcept: string, directions: ThematicDirection[]): Promise<KeywordGroup[]> => {
  const directionTitles = directions.map(d => d.title).join(', ');

  // Step 1: Get keyword ideas from Gemini, without asking for volume/competition.
  const geminiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `
      Blog Concept: "${blogConcept}"
      Thematic Directions: ${directionTitles}
      Based on the concept and directions, create a content strategy with 8-10 keyword groups.
      Each group must have a unique, clear title, a brief description, and a list of 3-5 related keywords.
      Prioritize the groups starting from 1.
      Return the result as a JSON array of objects. The keywords should be an array of objects, each with just a "keyword" string property.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.INTEGER },
            groupTitle: { type: Type.STRING },
            description: { type: Type.STRING },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING } }, required: ["keyword"] },
            },
          },
          required: ["priority", "groupTitle", "description", "keywords"],
        },
      },
    },
  });

  const jsonStr = geminiResponse.text.trim();
  let geminiGroups: (Omit<KeywordGroup, 'keywords'> & { keywords: { keyword: string }[] })[];
  try {
    geminiGroups = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON for content strategy from Gemini:", jsonStr);
    throw new Error("Received invalid format for content strategy from AI.");
  }

  // Step 2: Extract all unique keywords to fetch data for.
  const allKeywords = [...new Set(geminiGroups.flatMap(group => group.keywords?.map(kw => kw.keyword) || []).filter(kw => kw))];

  // Step 3: Fetch real data from the backend API.
  const keywordData = await fetchKeywordData(allKeywords);
  
  // Create a map from a normalized (space-removed) keyword to its data.
  // This handles the discrepancy between Gemini's output (e.g., "自己肯定感を上げる")
  // and the API response keys (e.g., "自己 肯定 感 を 上げる").
  const normalizedDataMap = Object.entries(keywordData).reduce((map, [key, value]) => {
    if (value) {
      map.set(key.replace(/\s+/g, ''), value);
    }
    return map;
  }, new Map<string, KeywordVolumeData>());

  // Step 4: Map the real data back to the groups.
  const populatedGroups: KeywordGroup[] = geminiGroups.map(group => ({
    ...group,
    keywords: (group.keywords || []).map(kwObj => {
      // Normalize the keyword from Gemini to look up in our map.
      const normalizedKeyword = kwObj.keyword.replace(/\s+/g, '');
      const data = normalizedDataMap.get(normalizedKeyword);
      
      return {
        keyword: kwObj.keyword,
        monthlySearches: data?.avgMonthlySearches ?? 0,
        competition: data ? mapCompetitionLevel(data.competitionLevel) : CompetitionLevel.LOW,
      };
    }),
  }));

  return populatedGroups;
};

export const expandContentStrategy = async (blogConcept: string, selectedDirections: ThematicDirection[], existingGroups: KeywordGroup[]): Promise<KeywordGroup[]> => {
  const directionTitles = selectedDirections.map(d => d.title).join(', ');
  const existingGroupTitles = existingGroups.map(g => `- ${g.groupTitle}`).join('\n');
  const maxPriority = Math.max(...existingGroups.map(g => g.priority), 0);

  // Step 1: Get new keyword ideas from Gemini.
  const geminiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `
      Blog Concept: "${blogConcept}"
      Thematic Directions: ${directionTitles}
      You are expanding an existing content strategy. Here are the existing keyword groups:
      ${existingGroupTitles}
      Generate 5 new, distinct keyword groups that are not in the list above.
      Each group must have a unique, clear title, a brief description, and a list of 3-5 related keywords.
      Start the priority for these new groups from ${maxPriority + 1}.
      Return the result as a JSON array of objects. Keywords should be an array of objects with a "keyword" string property.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            priority: { type: Type.INTEGER },
            groupTitle: { type: Type.STRING },
            description: { type: Type.STRING },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.OBJECT, properties: { keyword: { type: Type.STRING } }, required: ["keyword"] },
            },
          },
          required: ["priority", "groupTitle", "description", "keywords"],
        },
      },
    },
  });

  const jsonStr = geminiResponse.text.trim();
  let newGeminiGroups: (Omit<KeywordGroup, 'keywords'> & { keywords: { keyword: string }[] })[];
  try {
    newGeminiGroups = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON for expanded strategy from Gemini:", jsonStr);
    throw new Error("Received invalid format for expanded strategy from AI.");
  }

  // Step 2: Extract new keywords.
  const allNewKeywords = [...new Set(newGeminiGroups.flatMap(group => group.keywords?.map(kw => kw.keyword) || []).filter(Boolean))];

  // Step 3: Fetch real data for new keywords.
  const keywordData = await fetchKeywordData(allNewKeywords);
  
  // Create a normalized map for the new keywords.
  const normalizedDataMap = Object.entries(keywordData).reduce((map, [key, value]) => {
    if (value) {
      map.set(key.replace(/\s+/g, ''), value);
    }
    return map;
  }, new Map<string, KeywordVolumeData>());
  
  // Step 4: Map data back.
  const populatedNewGroups: KeywordGroup[] = newGeminiGroups.map(group => ({
    ...group,
    keywords: (group.keywords || []).map(kwObj => {
      const normalizedKeyword = kwObj.keyword.replace(/\s+/g, '');
      const data = normalizedDataMap.get(normalizedKeyword);
      return {
        keyword: kwObj.keyword,
        monthlySearches: data?.avgMonthlySearches ?? 0,
        competition: data ? mapCompetitionLevel(data.competitionLevel) : CompetitionLevel.LOW,
      };
    }),
  }));

  return populatedNewGroups;
};

export const generateArticleForGroup = async (blogConcept: string, group: KeywordGroup): Promise<GeneratedArticle> => {
  const keywordList = group.keywords.map(k => k.keyword).join(', ');

  // Find the keyword with the highest search volume to be featured in the title.
  const mainKeywordForTitle = group.keywords.length > 0
    ? group.keywords.reduce((max, kw) => kw.monthlySearches > max.monthlySearches ? kw : max, group.keywords[0]).keyword
    : group.groupTitle; // Fallback to group title if no keywords

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: `
      Blog Concept: "${blogConcept}"
      Keyword Group: "${group.groupTitle}"
      Group Description: "${group.description}"
      Target Keywords: ${keywordList}
      Main Keyword to include in Title: "${mainKeywordForTitle}"

      上記の情報を基に、最高品質の日本語ブログ記事を作成してください。

      **最重要指示:**
      1.  **素人感と人間味:** AIが生成したような完璧で堅苦しい文章は絶対に避けてください。親しみやすく、時には少し不器用さも感じさせるくらいの「素人感」を前面に出してください。日常的な言葉遣いを多用し、読者が「わかる！」と共感できるような個人的な感情（例：「〜で本当に困ったんですよね」「〜ができた時はめちゃくちゃ嬉しかった！」）を具体的に盛り込んでください。改行を多めに使い、読みやすい会話のようなリズムを心がけてください。

      2.  **物語のような体験談（SEO評価の核）:** 記事全体を通して、一つの具体的な体験談を自然に織り交ぜてください。テーマに関連した、書き手自身の（創作した）失敗談や、それを乗り越えた際の具体的なエピソードを盛り込み、読者が物語を読むように引き込まれるようにしてください。「以前、私は〜で大失敗しました。その時の状況は…」のように、具体的な情景が目に浮かぶようなリアルな描写を心がけてください。このE-E-A-T（経験・体験）を色濃く反映させることが、この記事の最も重要な価値です。

      **その他の指示:**
      *   **トーン＆マナー:** 記事の文体や一人称は、提供された「ブログコンセプト」に厳密に従ってください。
      *   **タイトル:** 記事のタイトルには、必ず「タイトルに含めるメインキーワード」('${mainKeywordForTitle}')を自然な形で含めてください。キャッチーでありながら、人間味のある言葉遣いを心がけてください。
      *   **サムネイル用キャッチコピー:** 記事の内容を要約し、クリックしたくなるような、短く（15文字以内が望ましい）て非常にキャッチーなコピーを1つ作成してください。これは記事タイトルとは別に、サムネイル画像に入れるためのものです。
      *   **キーワードの組み込み:** 「ターゲットキーワード」を、本文や、特に見出し（##や###）に組み込んでください。「ターゲットキーワード」は全て記事内に組み込んでください。【※重要！】キーワードをそのまま使うと文章として不自然になることが多々あります。単語を並び替えたり、助詞を補ったりして、日本語として自然な文章にして組みこんでください。
      *   **フォーマット:** マークダウン形式を使用してください。
      *   **分量:** ある程度の分量を確保して、取り入れるべき「ターゲットキーワード」を全て盛り込んでください。最後に簡単にまとめて記事を終わらせてください。記事の最後にさりげなく良かったらフォローしてください的な一言を添えてください。

      結果は、"title"（記事タイトル）、"content"（マークダウン形式の記事本文）、"thumbnailCatchphrase"（サムネイル用キャッチコピー）をキーに持つ単一のJSONオブジェクトとして返却してください。contentには、タイトルを除いた本文のみを含めてください。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          thumbnailCatchphrase: { type: Type.STRING },
        },
        required: ["title", "content", "thumbnailCatchphrase"],
      },
    },
  });

  const jsonStr = response.text.trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON for article:", jsonStr);
    throw new Error("Received invalid format for generated article.");
  }
};

export const generateThumbnailForArticle = async (title: string): Promise<string> => {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: `「${title}」というテーマのブログ記事用サムネイルの背景画像を生成してください。画像は、シンプルな淡い色合いの壁紙にしてください。テーマに関連した小さなイラストを、画像の隅のいずれか一つに控えめに配置してください。最重要：後から文字を入れるため、中央には大きな空白スペースを必ず残してください。全体のスタイルはクリーンでミニマルに。【※最重要！】生成する画像には、いかなるテキスト、文字、単語も含めないでください。`,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9',
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } else {
    throw new Error("Failed to generate thumbnail image.");
  }
};