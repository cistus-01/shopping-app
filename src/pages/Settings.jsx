import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Copy, Check, RefreshCw, Mic } from 'lucide-react'
import { createHousehold } from '../utils/sync'

export default function Settings() {
  const [token, setToken] = useState(() => localStorage.getItem('household_token') || '')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  const handleEnable = async () => {
    setLoading(true)
    setStatus(null)
    const newToken = await createHousehold()
    if (newToken) {
      localStorage.setItem('household_token', newToken)
      setToken(newToken)
      setStatus('success')
    } else {
      setStatus('error')
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisable = () => {
    localStorage.removeItem('household_token')
    setToken('')
    setStatus(null)
  }

  return (
    <div className="pb-24 space-y-5">
      <h2 className="text-lg font-bold text-gray-800">設定</h2>

      {/* Cloud Sync / Alexa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${token ? 'bg-emerald-100' : 'bg-gray-100'}`}>
            {token ? <Wifi className="text-emerald-600" size={20} /> : <WifiOff className="text-gray-400" size={20} />}
          </div>
          <div>
            <p className="font-semibold text-gray-800">クラウド同期・Alexa連携</p>
            <p className={`text-xs ${token ? 'text-emerald-600' : 'text-gray-400'}`}>
              {token ? '同期有効' : '未設定'}
            </p>
          </div>
        </div>

        {!token ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              有効にすると、複数デバイスで買い物リストを共有できます。
              Alexaとの連携にも必要です。
            </p>
            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Wifi size={16} />}
              {loading ? '設定中...' : 'クラウド同期を有効にする'}
            </button>
            {status === 'error' && (
              <p className="text-xs text-red-500 text-center">接続に失敗しました。後でもう一度お試しください。</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">世帯トークン（Alexa連携に使用）</p>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                <code className="flex-1 text-xs text-gray-700 font-mono break-all">{token}</code>
                <button onClick={handleCopy} className="text-gray-400 hover:text-emerald-500 shrink-0">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                <Mic size={16} />
                <span>Alexa連携の設定方法</span>
              </div>
              <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                <li>Alexaアプリを開く</li>
                <li>「スキル・ゲーム」で「かいもの帳」を検索</li>
                <li>スキルを有効にしてアカウントリンク</li>
                <li>上のトークンをAlexaアプリに入力</li>
              </ol>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-xs text-emerald-700 font-semibold mb-1">使えるAlexaコマンド</p>
              <ul className="text-xs text-emerald-600 space-y-1">
                <li>「アレクサ、かいもの帳を開いて」</li>
                <li>「アレクサ、[商品名]をリストに追加して」</li>
                <li>「アレクサ、買い物リストを読んで」</li>
                <li>「アレクサ、今週買うものは何？」</li>
              </ul>
            </div>

            <button onClick={handleDisable} className="w-full py-2 text-sm text-red-400 border border-red-100 rounded-xl">
              同期を無効にする
            </button>
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="font-semibold text-gray-700 mb-3">アプリ情報</p>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>バージョン</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>サービス</span>
            <span>Irodori（いろどり）</span>
          </div>
        </div>
      </div>
    </div>
  )
}
