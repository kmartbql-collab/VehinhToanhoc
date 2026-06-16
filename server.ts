import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Accept larger payloads (up to 10MB) for image upload processing
  app.use(express.json({ limit: '10mb' }));

  // Endpoint to securely proxy Gemini API requests
  app.post("/api/generate", async (req, res) => {
    try {
      const { model, prompt, additionalPrompt, image, imageMime } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: {
            message: "Không tìm thấy cấu hình GEMINI_API_KEY trên môi trường máy chủ. Vui lòng thiết lập biến môi trường này trong cấu hình Secrets hoặc file .env."
          }
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const fullPrompt = additionalPrompt 
        ? `${prompt}\n\nYêu cầu bổ sung:\n${additionalPrompt}` 
        : prompt;

      const contentsParts: any[] = [];

      if (image) {
        const base64Data = image.includes(',') ? image.split(',')[1] : image;
        contentsParts.push({
          inlineData: {
            mimeType: imageMime || 'image/jpeg',
            data: base64Data
          }
        });
      }

      contentsParts.push({ 
        text: `Đề bài: ${fullPrompt || "Hãy vẽ hình theo mẫu trong file ảnh hoặc giải quyết đề thi trong ảnh."}` 
      });

      const systemInstructionText = "Bạn là chuyên gia về phần mềm Toán học GeoGebra. Hãy chuyển đổi yêu cầu vẽ hình hoặc đề bài toán học của người dùng thành các mã lệnh GeoGebra (GeoGebra Script) chính xác để minh họa cấu trúc toán học đó. Bạn hãy sử dụng các lệnh GeoGebra chuẩn bằng tiếng Anh (như Point, Line, Circle, Segment, Polygon, Intersect, Midpoint, Angle) hoặc bằng tiếng Việt (như Điểm, ĐườngThẳng, ĐườngTròn, ĐoạnThẳng, ĐaGiác, GiaoĐiểm, TrungĐiểm, Góc) để tương thích hoàn hảo với tệp tài nguyên Việt hóa. Chỉ trả về mã lệnh dưới dạng plain text, đặt mỗi câu lệnh trên một dòng mới độc lập, không có giải thích dài dòng và không nằm trong các block markdown (như ```geogebra).";

      // Use a secure model from @google/genai guidelines.
      // We map or fallback to gemini-3.5-flash which is recommended for basic task/summarization.
      // Or gemini-3.1-pro-preview for complex tasks.
      let chosenModel = 'gemini-3.5-flash';
      if (model === 'gemini-3.1-pro-preview') {
        chosenModel = 'gemini-3.1-pro-preview';
      }

      const response = await ai.models.generateContent({
        model: chosenModel,
        contents: contentsParts,
        config: {
          systemInstruction: systemInstructionText,
        }
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({
          error: {
            message: "Không nhận được phản hồi văn bản từ mô hình Gemini."
          }
        });
      }

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("Gemini Generation Error:", error);
      res.status(500).json({
        error: {
          message: error.message || "Lỗi không xác định xảy ra khi gọi API Gemini trên máy chủ."
        }
      });
    }
  });

  // Vite development vs production asset handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
