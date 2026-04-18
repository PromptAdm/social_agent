import { Loader2, Mic, Film } from 'lucide-react'

interface ProcessingViewProps {
  phase: 'transcribing' | 'rendering'
}

const PHASE_CONFIG = {
  transcribing: {
    icon:    Mic,
    label:   'Transcrevendo fala...',
    detail:  'A IA está analisando o áudio e convertendo em texto. Isso pode levar alguns minutos.',
    color:   'text-indigo-400',
    bg:      'bg-indigo-600/10',
    border:  'border-indigo-500/20',
    steps:   ['Analisando áudio', 'Detectando idioma', 'Segmentando falas', 'Sincronizando tempos'],
  },
  rendering: {
    icon:    Film,
    label:   'Renderizando vídeo...',
    detail:  'O FFmpeg está embutindo as legendas no vídeo. A duração depende do tamanho do arquivo.',
    color:   'text-violet-400',
    bg:      'bg-violet-600/10',
    border:  'border-violet-500/20',
    steps:   ['Gerando arquivo SRT', 'Abrindo vídeo original', 'Aplicando legendas', 'Exportando arquivo final'],
  },
}

export function ProcessingView({ phase }: ProcessingViewProps) {
  const cfg  = PHASE_CONFIG[phase]
  const Icon = cfg.icon

  return (
    <div className="max-w-lg mx-auto px-6 py-16 flex flex-col items-center text-center gap-8">

      {/* Animated icon */}
      <div className="relative">
        <div className={`w-20 h-20 ${cfg.bg} border ${cfg.border} rounded-3xl flex items-center justify-center`}>
          <Icon className={`w-9 h-9 ${cfg.color}`} />
        </div>
        <div className="absolute -inset-2 rounded-3xl border border-indigo-500/15 animate-ping" />
      </div>

      {/* Labels */}
      <div>
        <h2 className="text-[22px] font-semibold text-slate-100 mb-2">{cfg.label}</h2>
        <p className="text-[14px] text-slate-500 leading-relaxed">{cfg.detail}</p>
      </div>

      {/* Progress steps */}
      <div className="w-full space-y-2.5">
        {cfg.steps.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className="relative w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {i === 0 ? (
                <Loader2 className={`w-4 h-4 ${cfg.color} animate-spin`} />
              ) : (
                <div className="w-2 h-2 bg-[#27273A] rounded-full" />
              )}
            </div>
            <span className={`text-[13px] ${i === 0 ? 'text-slate-300 font-medium' : 'text-slate-600'}`}>
              {step}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[12px] text-slate-700">
        Esta página se atualizará automaticamente quando o processamento terminar.
      </p>
    </div>
  )
}
