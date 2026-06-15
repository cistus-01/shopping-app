import { useState } from 'react'

const steps = [
  {
    icon: (
      <svg className="w-9 h-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" />
      </svg>
    ),
    title: '買い物リスト',
    text: '商品名を入力して追加します。候補から選ぶと次回から周期も自動で計算されます。',
  },
  {
    icon: (
      <svg className="w-9 h-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '買ったら記録',
    text: '購入したらチェックして「記録する」を押すだけ。個数も変えられます。',
  },
  {
    icon: (
      <svg className="w-9 h-9 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '次に買う時期を予測',
    text: '2回以上記録したアイテムは、次いつ切れるかを自動で計算して教えてくれます。',
  },
]

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            {steps[step].icon}
          </div>
          <h2 className="text-lg font-black text-gray-800 mb-2">{steps[step].title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{steps[step].text}</p>
        </div>

        <div className="flex justify-center gap-2 pb-5">
          {steps.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-5 h-1.5 bg-emerald-500' : 'w-1.5 h-1.5 bg-gray-200'}`} />
          ))}
        </div>

        <div className="px-6 pb-8 flex gap-2.5">
          {!isLast && (
            <button onClick={onClose} className="flex-1 py-3 text-sm text-gray-400 font-medium">
              スキップ
            </button>
          )}
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl text-sm font-bold shadow-md shadow-emerald-200 active:bg-emerald-600 transition-colors"
          >
            {isLast ? 'はじめる' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  )
}
