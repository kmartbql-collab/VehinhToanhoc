import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, PlusCircle, PenTool, RefreshCw, FolderPlus, Copy, Check, Info, Upload, Eye, EyeOff } from 'lucide-react';

declare global {
  interface Window {
    GGBApplet?: any;
    ggbApplet?: any;
  }
}

interface GeoGebraViewerProps {
  script: string;
}

function GeoGebraViewer({ script }: GeoGebraViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const initializedRef = useRef<boolean>(false);
  const callbackNameRef = useRef<string>("");

  useEffect(() => {
    let timer: any;
    const callbackName = `onGeoGebraReady_${Math.random().toString(36).substring(2, 9)}`;
    callbackNameRef.current = callbackName;

    const initApplet = () => {
      // Wait until GGBApplet loader script is loaded on window
      if (!window.GGBApplet) {
        timer = setTimeout(initApplet, 100);
        return;
      }

      if (initializedRef.current || !containerRef.current) return;
      initializedRef.current = true;

      // Clear any prior content
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Define callback function in window scope
      (window as any)[callbackName] = (api: any) => {
        console.log("GeoGebra API loaded and ready via callback:", api);
        setApiReady(api);
        window.ggbApplet = api;
        setLoading(false);
      };

      // Register ggbOnInit as a global fallback
      (window as any).ggbOnInit = (id: string, api: any) => {
        console.log("ggbOnInit fallback:", id, api);
        const actualApi = api || (window as any)[id] || window.ggbApplet;
        if (actualApi) {
          setApiReady(actualApi);
          window.ggbApplet = actualApi;
          setLoading(false);
        }
      };

      const params = {
        id: 'ggbApplet',
        appName: 'classic',
        width: 800,
        height: 500,
        showToolBar: false,
        showMenuBar: false,
        showAlgebraInput: false,
        useBrowserForJS: true, // MUST BE true to trigger appletOnLoad callback
        enableShiftDragZoom: true,
        enableRightClick: false,
        errorDialogsActive: false,
        isHTML5: true,
        language: 'en',
        allowRescale: true, // Make applet responsive inside containment boxes
        appletOnLoad: callbackName,
      };

      try {
        console.log("Injecting GGBApplet with params:", params);
        const applet = new window.GGBApplet(params, true);
        applet.inject(containerRef.current);
      } catch (err) {
        console.error("Error creating or injecting GGBApplet:", err);
        setLoading(false);
      }
    };

    initApplet();

    return () => {
      clearTimeout(timer);
      initializedRef.current = false;
      if (callbackNameRef.current && (window as any)[callbackNameRef.current]) {
        delete (window as any)[callbackNameRef.current];
      }
    };
  }, []);

  // Execute Commands on Script/API state change
  useEffect(() => {
    if (!apiReady) return;

    try {
      console.log("Evaluating script in GeoGebraViewer...", script);
      
      const runCommands = () => {
        if (apiReady.newConstruction) {
          apiReady.newConstruction();
        } else if (apiReady.reset) {
          apiReady.reset();
        }

        // Add default axes and grid visualization using standard safe JS API
        if (apiReady.showAxes) {
          apiReady.showAxes(true);
        } else if (apiReady.evalCommand) {
          apiReady.evalCommand('ShowAxes[true]');
        }
        
        if (apiReady.showGrid) {
          apiReady.showGrid(true);
        } else if (apiReady.evalCommand) {
          apiReady.evalCommand('ShowGrid[true]');
        }

        if (script) {
          const lines = script.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
              try {
                if (apiReady.evalCommand) {
                  apiReady.evalCommand(trimmed);
                }
              } catch (evalErr) {
                console.warn(`Failed to eval ggb command: "${trimmed}"`, evalErr);
              }
            }
          }
        }
      };

      // Add a slight delay to allow the rendering context to settle securely
      const delayTimer = setTimeout(runCommands, 150);
      return () => clearTimeout(delayTimer);
    } catch (err) {
      console.error('GeoGebra script execution error:', err);
    }
  }, [apiReady, script]);

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden border border-slate-200 p-1.5 shadow-md">
      <div className="relative w-full h-[450px] min-h-[400px] bg-white rounded-lg flex flex-col justify-center items-center overflow-hidden">
        {/* Target container for GGBApplet inject - managed dynamically via ref */}
        <div 
          ref={containerRef} 
          className="w-full h-full bg-white"
        />
        
        {/* Loading overlay container - stays in DOM to prevent React DOM reconciliation interference */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-3 z-10 bg-slate-900 text-indigo-200 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-400 border-t-transparent"></div>
            <p className="text-sm font-semibold animate-pulse">Đang chuẩn bị bảng vẽ GeoGebra...</p>
            <p className="text-xs text-indigo-300/60 max-w-xs leading-relaxed">
              Hệ thống đang tải thư viện toán học từ máy chủ GeoGebra. Quá trình này có thể mất vài giây.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [model, setModel] = useState('gemini-3.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  
  // Image Upload State
  const [image, setImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedKey = sessionStorage.getItem('geogebra_assistant_api_key') || localStorage.getItem('geogebra_assistant_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    const cleanKey = value.trim().replace(/^["']|["']$/g, '');
    sessionStorage.setItem('geogebra_assistant_api_key', cleanKey);
    localStorage.setItem('geogebra_assistant_api_key', cleanKey);
  };

  const saveConfig = () => {
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    setApiKey(cleanKey);
    sessionStorage.setItem('geogebra_assistant_api_key', cleanKey);
    localStorage.setItem('geogebra_assistant_api_key', cleanKey);
    alert('Đã lưu cấu hình API Key vào bộ nhớ trình duyệt thành công!');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      setImage(resultStr);
      setImageMime(file.type);
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setPrompt('');
    setAdditionalPrompt('');
    setResult('');
    setErrorMessage('');
    setImage(null);
    setImageMime('');
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const drawFromAI = () => {
    const ggb = window.ggbApplet || (window as any).ggbApplet;
    if (!ggb) {
      alert("Bảng vẽ GeoGebra chưa sẵn sàng hoặc chưa được khởi tạo!");
      return;
    }

    try {
      // Clear old drawing (reset) before drawing new
      if (ggb.reset) {
        ggb.reset();
      } else if (ggb.newConstruction) {
        ggb.newConstruction();
      }

      // Default grid and axes
      ggb.evalCommand('ShowAxes(true)');
      ggb.evalCommand('ShowGrid(true)');

      // Read from textarea with id="ai-commands"
      const textarea = document.getElementById('ai-commands') as HTMLTextAreaElement | null;
      const scriptContent = textarea ? textarea.value : result;

      // Sync React state if manual changes were made to textarea
      if (textarea && textarea.value !== result) {
        setResult(textarea.value);
      }

      // Separate each line command and execute on GeoGebra
      const commands = scriptContent.split('\n');
      commands.forEach((cmd) => {
        const cleanCmd = cmd.trim();
        if (cleanCmd !== "" && !cleanCmd.startsWith('//') && !cleanCmd.startsWith('#')) {
          try {
            ggb.evalCommand(cleanCmd);
          } catch (e) {
            console.warn("Lỗi thực thi lệnh GeoGebra:", cleanCmd, e);
          }
        }
      });
    } catch (err: any) {
      console.error("Lỗi vẽ hình ggb:", err);
      alert("Có lỗi xảy ra khi vẽ hình: " + err.message);
    }
  };

  const generate = async () => {
    if (!prompt.trim() && !image) {
       alert('Vui lòng nhập nội dung yêu cầu hoặc tải ảnh đề thi lên.');
       return;
    }

    setLoading(true);
    setResult('');
    setErrorMessage('');
    setCopied(false);

    try {
      let dataText = '';
      const systemInstructionText = "Bạn là chuyên gia về phần mềm Toán học GeoGebra. Hãy chuyển đổi yêu cầu vẽ hình hoặc đề bài toán học của người dùng thành các mã lệnh GeoGebra (GeoGebra Script) định dạng Tiếng Anh chuẩn (Standard English GeoGebra Commands) chính xác để minh họa cấu trúc toán học đó. Bạn BẮT BUỘC phải sử dụng toàn bộ các lệnh GeoGebra chuẩn bằng tiếng Anh (ví dụ: Point, Line, Circle, Segment, Polygon, Intersect, Midpoint, Angle, Vector, Tangent, Slider, Text, ShowAxes, ShowGrid). TUYỆT ĐỐI KHÔNG dùng các câu lệnh bằng tiếng Việt (như Điểm, ĐườngThẳng, ĐoạnThẳng, GiaoĐiểm, TrungĐiểm...) để đảm bảo mã lệnh tương thích hoàn hảo và chạy ổn định nhất trên mọi phiên bản GeoGebra. Chỉ trả về mã lệnh dưới dạng plain text, đặt mỗi câu lệnh trên một dòng mới độc lập, không có giải thích dài dòng và không nằm trong các block markdown (như ```geogebra).";

      if (apiKey && apiKey.trim()) {
        // Direct client-side Gemini API call using user's custom API key (helpful on GitHub Pages / static hosting)
        const fullPrompt = additionalPrompt 
          ? `${prompt}\n\nYêu cầu bổ sung:\n${additionalPrompt}` 
          : prompt;

        const parts: any[] = [];

        if (image) {
          const base64Data = image.includes(',') ? image.split(',')[1] : image;
          parts.push({
            inlineData: {
              mimeType: imageMime || 'image/jpeg',
              data: base64Data
            }
          });
        }

        parts.push({ 
          text: `Đề bài: ${fullPrompt || "Hãy vẽ hình theo mẫu trong file ảnh hoặc giải quyết đề thi trong ảnh."}` 
        });

        const activeModel = model;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstructionText }]
            },
            contents: [
              {
                role: "user",
                parts: parts
              }
            ]
          })
        });

        if (!response.ok) {
          let descriptiveError = `Lỗi API (${response.status} ${response.statusText})`;
          try {
            const errData = await response.json();
            if (errData?.error?.message) {
              descriptiveError = errData.error.message;
            }
          } catch (e) {
            // ignore
          }
          throw new Error(descriptiveError);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
          dataText = data.candidates[0].content.parts[0].text;
        } else {
          throw new Error("Không nhận được kết quả từ khoá API Gemini của bạn.");
        }

      } else {
        // Call backend proxy API
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            additionalPrompt,
            image,
            imageMime,
            userApiKey: apiKey
          })
        });

        if (!response.ok) {
          let descriptiveError = `Lỗi API (${response.status} ${response.statusText})`;
          if (response.status === 404) {
            descriptiveError = "Lỗi kết nối máy chủ (404). Nếu bạn đang chạy ứng dụng này trên GitHub Pages (hoặc môi trường hosting tĩnh không chạy Node.js server), vui lòng cấu hình/nhập khóa Gemini API của riêng bạn ở ô cấu hình API Key bên trên để ứng dụng hoạt động trực tiếp từ trình duyệt!";
          } else {
            try {
              const errData = await response.json();
              if (errData?.error?.message) {
                descriptiveError = errData.error.message;
              }
            } catch (e) {
              // ignore
            }
          }
          throw new Error(descriptiveError);
        }

        const data = await response.json();
        if (data.text) {
          dataText = data.text;
        } else {
          throw new Error("Không nhận được kết quả hợp lệ từ máy chủ API.");
        }
      }

      if (dataText) {
        let text = dataText.trim();
        // Fallback cleanup if the model still returns markdown code block markers
        if (text.startsWith('```')) {
            const lines = text.split('\n');
            lines.shift();
            if(lines.length > 0 && lines[lines.length - 1].startsWith('```')) {
                lines.pop();
            }
            text = lines.join('\n').trim();
        }
        setResult(text);
      } else {
        setResult('Không nhận được kết quả hợp lệ từ AI. Hãy thử lại hoặc đổi mô hình.');
      }
    } catch (error: any) {
      setErrorMessage(error.message);
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-950 text-white font-sans sm:p-4 md:p-8" style={{ background: 'radial-gradient(circle at top left, #1e1b4b, #312e81, #1e1b4b)' }}>
      <div className="max-w-xl mx-auto w-full space-y-4 p-4 sm:p-0">
        
        {/* Header */}
        <header className="bg-purple-600/90 backdrop-blur-md rounded-2xl p-5 mb-4 text-center shadow-lg border border-purple-400/30">
          <h1 className="text-3xl font-bold text-yellow-400 drop-shadow-sm mb-1">Trợ Lý Giáo Viên Toán AI</h1>
          <p className="text-white/90 text-sm font-medium uppercase tracking-wider">
            Tạo hình vẽ Toán qua mô tả bằng GeoGebra
          </p>
        </header>

        {/* Configuration Card */}
        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-pink-400 w-6 h-6" strokeWidth={2.5} />
            <h2 className="text-lg font-bold text-white tracking-tight">Cấu Hình API Key (Không bắt buộc)</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/70 mb-3 leading-relaxed">
                Mặc định hệ thống sẽ sử dụng API Key cấu hình từ máy chủ. Nếu muốn dùng API Key của riêng bạn (để không bị giới hạn hoặc khi deploy lên GitHub), hãy nhập ở đây. Khóa này chỉ lưu trong trình duyệt của bạn (Local Storage) nên tuyệt đối an toàn.
              </p>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">API Key của Google Gemini</label>
              <div className="relative">
                <input 
                  type={showKey ? 'text' : 'password'} 
                  value={apiKey} 
                  onChange={e => handleApiKeyChange(e.target.value)} 
                  placeholder="Nhập API Key của bạn (AI Studio)" 
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/45 transition-colors" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowKey(!showKey)} 
                  className="absolute right-3 top-3.5 text-white/50 hover:text-white/80 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {apiKey ? (
                <span className="text-[10px] text-green-400 font-medium block mt-1 animate-pulse">
                  ✓ Đã tự động lưu vào bộ nhớ tạm và sẵn sàng sử dụng
                </span>
              ) : (
                <span className="text-[10px] text-white/40 font-medium block mt-1">
                  Khoá này sẽ tự động lưu tạm khi bạn vừa nhập hoặc dán vào.
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={saveConfig} 
                className="flex-1 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md"
              >
                Lưu Cấu Hình Key
              </button>
              {apiKey && (
                <button 
                  onClick={() => {
                    setApiKey('');
                    sessionStorage.removeItem('geogebra_assistant_api_key');
                    localStorage.removeItem('geogebra_assistant_api_key');
                    alert('Đã xóa API Key thành công!');
                  }} 
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors"
                >
                  Xóa Key đã lưu
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Creation Card */}
        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="text-green-400 w-6 h-6" strokeWidth={2.5} />
            <h2 className="text-lg font-bold text-white tracking-tight">Tạo Hình Vẽ</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1 uppercase">Chọn mô hình AI</label>
              <select 
                value={model} 
                onChange={e => setModel(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option className="bg-slate-800 text-white" value="gemini-3.5-flash">Gemini 3.5 Flash (Khuyên dùng)</option>
                <option className="bg-slate-800 text-white" value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Nâng cao)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase">Tải đề bài lên (Mô tả đề thi/Hình vẽ mẫu)</label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-250 text-xs font-bold py-2.5 px-4 rounded-xl transition-all">
                    <Upload className="w-4 h-4 text-indigo-300" />
                    <span>Chọn File Đề Bài</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                  </label>
                  {image && (
                    <button 
                      onClick={() => { setImage(null); setImageMime(''); }} 
                      type="button"
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 px-4 py-2.5 rounded-xl font-bold text-xs"
                    >
                      Xóa Ảnh
                    </button>
                  )}
                </div>
                {image && (
                  <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/20 p-2 max-h-48 flex justify-center">
                    <img src={image} alt="Problem Preview" className="max-h-40 object-contain rounded-lg" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1 uppercase">Nội dung yêu cầu</label>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)} 
                rows={3} 
                placeholder="Ví dụ: Vẽ đồ thị hàm số y=x^3-3x+1 trên đoạn [-2,2] và tiếp tuyến tại x=1." 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1 uppercase">Yêu cầu thêm nhiều lần kể cả sau khi tạo hình vẽ...</label>
              <textarea 
                value={additionalPrompt} 
                onChange={e => setAdditionalPrompt(e.target.value)} 
                rows={2} 
                placeholder="Ví dụ: Đổi màu đường tiếp tuyến thành màu đỏ, ẩn hệ trục tọa độ..." 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/30 transition-colors" 
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={generate} 
                disabled={loading} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:opacity-50 active:scale-[0.98] text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg"
              >
                <PenTool className="w-5 h-5" />
                {loading ? 'Đang xử lý...' : 'Tạo Hình Vẽ'}
              </button>
              <button 
                onClick={resetForm} 
                className="bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white font-bold px-5 py-3 rounded-xl flex justify-center items-center transition-all border border-white/10 shadow-lg"
                title="Làm mới form"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Result Card */}
        <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden flex flex-col relative">
          <div className="bg-blue-400/20 px-5 py-4 border-b border-white/10">
            <h2 className="text-xl font-black text-blue-400 text-center tracking-tight uppercase">Bảng Kết Quả &amp; Bản Vẽ</h2>
          </div>
          
          <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-6 relative">
            {/* Loading overlay for AI generation process */}
            {loading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-center rounded-2xl">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-400 border-t-transparent mb-3"></div>
                <p className="text-indigo-200 font-semibold text-sm animate-pulse">Đang phân tích và sinh mã vẽ hình GeoGebra...</p>
                <p className="text-xs text-indigo-300/60 max-w-xs mt-1">Hệ thống đang gọi Gemini AI để dịch đề bài sang GeoGebra Script.</p>
              </div>
            )}

            {errorMessage && (
              <div className="text-left w-full bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-red-200 text-sm space-y-3 animate-in fade-in duration-300">
                <div className="flex items-start gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-base">Gọi API thất bại</span>
                </div>
                <div className="bg-black/30 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre-wrap select-text border border-red-500/10">
                  {errorMessage}
                </div>
                <div className="pt-2 text-xs text-white/70 space-y-1.5 border-t border-white/10">
                  <p className="font-semibold text-white/90">Hướng dẫn khắc phục:</p>
                  <ul className="list-disc list-inside space-y-1 pl-1">
                    <li>Hãy dán vào khóa API Key của riêng bạn để chạy cục bộ (Session / LocalStorage).</li>
                    <li>Đảm bảo dịch vụ của khóa API hỗ trợ vùng địa lý hiện tại.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="w-full space-y-6">
              <div>
                <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-bold">
                  <Info className="w-3.5 h-3.5" />
                  <span>Bản vẽ GeoGebra trực quan (Hệ thống tự động vẽ)</span>
                </h3>
                {/* Persistent Mount of GeoGebraViewer to prevent destruction & slow downloads of applet canvas */}
                <GeoGebraViewer script={result} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                  <span className="text-xs font-mono text-green-400 uppercase tracking-widest flex items-center gap-1 font-bold">
                    <PenTool className="w-3.5 h-3.5 text-green-400" />
                    <span>GeoGebra Script (Bấm Vẽ để cập nhật bản vẽ)</span>
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={drawFromAI} 
                      className="text-xs bg-emerald-600/30 hover:bg-emerald-600/50 hover:text-emerald-250 text-emerald-300 font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all border border-emerald-500/30 active:scale-[0.97]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thực thi / Vẽ lại</span>
                    </button>
                    <button 
                      onClick={copyToClipboard} 
                      className="text-xs bg-white/10 hover:bg-white/20 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-white/20"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Đã Copy' : 'Copy Mã Script'}
                    </button>
                  </div>
                </div>
                <textarea 
                  id="ai-commands"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  rows={8}
                  placeholder="Các câu lệnh GeoGebra vẽ hình sẽ xuất hiện ở đây sau khi AI sinh mã, hoặc bạn tự viết các lệnh (ví dụ: A = (1, 2) ...)"
                  className="w-full bg-black/40 p-4 rounded-xl text-[13px] font-mono whitespace-pre text-blue-200 border border-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 font-medium leading-relaxed resize-y select-text shadow-inner transition-all block"
                />
              </div>
            </div>
          </div>
        </section>
        
        <footer className="text-center text-xs text-white/40 py-4 font-medium">
          Trợ Lý Giáo Viên Toán AI &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
