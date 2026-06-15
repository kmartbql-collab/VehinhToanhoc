import { useState, useEffect } from 'react';
import { AlertCircle, PlusCircle, PenTool, RefreshCw, FolderPlus, Copy, Check } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [model, setModel] = useState('gemini-1.5-flash');
  const [prompt, setPrompt] = useState('');
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('geogebra_assistant_api_key');
    if (savedKey) setApiKey(savedKey);
    const savedPassword = localStorage.getItem('geogebra_assistant_pwd');
    if (savedPassword) setPassword(savedPassword);
  }, []);

  const saveConfig = () => {
    if (!apiKey.trim()) {
      alert('Vui lòng nhập API Key hợp lệ.');
      return;
    }
    localStorage.setItem('geogebra_assistant_api_key', apiKey.trim());
    if (password) {
      localStorage.setItem('geogebra_assistant_pwd', password);
    }
    alert('Đã lưu cấu hình thành công!');
  };

  const resetForm = () => {
    setPrompt('');
    setAdditionalPrompt('');
    setResult('');
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generate = async () => {
    if (!apiKey) {
      alert('Vui lòng nhập và lưu API Key trước khi sử dụng.');
      return;
    }
    if (!prompt.trim()) {
       alert('Vui lòng nhập nội dung yêu cầu.');
       return;
    }

    setLoading(true);
    setResult('');
    setCopied(false);

    try {
      const fullPrompt = additionalPrompt 
        ? `${prompt}\n\nYêu cầu bổ sung:\n${additionalPrompt}` 
        : prompt;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              { text: "Bạn là chuyên gia về phần mềm Toán học GeoGebra. Hãy chuyển đổi yêu cầu vẽ hình của người dùng thành các mã lệnh GeoGebra (GeoGebra Script) chính xác. Chỉ trả về mã lệnh dưới dạng plain text, không giải thích dài dòng. Không bao gồm các block markdown (như ```geogebra)." }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: fullPrompt }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        let text = data.candidates[0].content.parts[0].text.trim();
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
        setResult('Không nhận được kết quả hợp lệ từ AI.');
      }
    } catch (error: any) {
      alert(`Đã xảy ra lỗi: ${error.message}`);
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
            <AlertCircle className="text-red-500 w-6 h-6" strokeWidth={2.5} />
            <h2 className="text-lg font-bold text-white tracking-tight">Cấu Hình Ban Đầu</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1 uppercase">API Key của Google Gemini</label>
              <input 
                type="text" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                placeholder="Dán API Key của bạn vào đây" 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/40 transition-colors" 
              />
            </div>

            <div className="bg-white/5 p-4 rounded-xl text-sm text-white/70 space-y-2 border border-white/10">
              <p className="text-[10px] sm:text-xs font-bold text-purple-400 uppercase mb-2">Hướng dẫn lấy API Key:</p>
              <ol className="list-decimal list-inside space-y-1.5 ml-1 text-xs">
                <li>Truy cập <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium underline">Google AI Studio</a></li>
                <li>Đăng nhập bằng tài khoản Google của bạn</li>
                <li>Bấm <strong>Get API key</strong> ở menu điều hướng</li>
                <li>Tạo khóa, sao chép và dán vào ô trống phía trên</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1 uppercase">Mật khẩu</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Nhập mật khẩu để sử dụng" 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-white/40 transition-colors" 
              />
            </div>

            <button 
              onClick={saveConfig} 
              className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-bold py-2 sm:py-3 rounded-xl text-sm transition-colors shadow-md"
            >
              Lưu Cấu Hình
            </button>
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
                <option className="bg-slate-800 text-white" value="gemini-1.5-flash">Gemini 1.5 Flash (Nhanh)</option>
                <option className="bg-slate-800 text-white" value="gemini-1.5-pro">Gemini 1.5 Pro (Nâng cao)</option>
                <option className="bg-slate-800 text-white" value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
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
        <section className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden flex flex-col">
          <div className="bg-blue-400/20 px-5 py-4 border-b border-white/10">
            <h2 className="text-xl font-black text-blue-400 text-center tracking-tight uppercase">Kết Quả</h2>
          </div>
          
          <div className="p-6 sm:p-10 flex-1 flex flex-col items-center justify-center">
            {!result && !loading ? (
              <div className="text-center max-w-md w-full py-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <FolderPlus className="w-10 h-10 sm:w-12 sm:h-12 text-white/30" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">Chưa có mã nào được tạo</h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-xs mx-auto">
                  Vui lòng nhập nội dung để AI lập trình lệnh GeoGebra minh họa.
                </p>
              </div>
            ) : loading ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-indigo-200 mb-4"></div>
                <p className="text-indigo-300 font-semibold animate-pulse">Đang sinh mã GeoGebra...</p>
              </div>
            ) : (
              <div className="animate-in fade-in duration-300 w-full text-left">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-mono text-green-400 uppercase tracking-widest">GeoGebra Script</span>
                  <button 
                    onClick={copyToClipboard} 
                    className="text-xs bg-white/10 hover:bg-white/20 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-white/20"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Đã Copy' : 'Copy Code'}
                  </button>
                </div>
                <pre className="bg-black/40 p-5 rounded-xl overflow-x-auto text-[13px] font-mono whitespace-pre-wrap leading-relaxed shadow-inner border border-white/5 text-blue-200">
                  <code>{result}</code>
                </pre>
              </div>
            )}
          </div>
        </section>
        
        <footer className="text-center text-xs text-white/40 py-4 font-medium">
          Trợ Lý Giáo Viên Toán AI &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
