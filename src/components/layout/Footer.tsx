import { FaInstagram, FaFacebook, FaWhatsapp } from 'react-icons/fa'
import { useSettings } from '../../hooks/useSettings'

export default function Footer() {
  const { data: settings } = useSettings()

  const instagram = settings?.instagram_url?.trim() || ''
  const facebook  = settings?.facebook_url?.trim() || ''
  const whatsapp  = settings?.whatsapp_number
    ? `https://wa.me/${settings.whatsapp_number}`
    : ''

  const hasSocials = instagram || facebook || whatsapp

  return (
    <footer className="border-t border-[#3a2e4f]/20 mt-16 py-5 px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

        {hasSocials && (
          <div className="flex items-center gap-3 shrink-0">
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="w-8 h-8 rounded-full bg-[#1d1729] border border-[#3a2e4f]/30
                  flex items-center justify-center text-stone-500
                  hover:text-amber-400 hover:border-amber-400/40 transition-all">
                <FaInstagram size={15} />
              </a>
            )}
            {facebook && (
              <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                className="w-8 h-8 rounded-full bg-[#1d1729] border border-[#3a2e4f]/30
                  flex items-center justify-center text-stone-500
                  hover:text-amber-400 hover:border-amber-400/40 transition-all">
                <FaFacebook size={15} />
              </a>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                className="w-8 h-8 rounded-full bg-[#1d1729] border border-[#3a2e4f]/30
                  flex items-center justify-center text-stone-500
                  hover:text-amber-400 hover:border-amber-400/40 transition-all">
                <FaWhatsapp size={15} />
              </a>
            )}
          </div>
        )}

        <p className="text-stone-700 text-[11px] leading-relaxed text-center sm:text-left flex-1">
          <span className="text-stone-600 font-black uppercase tracking-widest mr-2">Políticas de uso</span>
          Este sitio es exclusivamente para realizar pedidos. No almacenamos datos personales. Los pedidos se gestionan vía WhatsApp, sin pagos en línea ni registro de usuario. Al enviar tu pedido aceptás que tu nombre y dirección sean compartidos con el negocio para coordinar la entrega.
        </p>

        <p className="text-stone-800 text-[11px] shrink-0">
          © {new Date().getFullYear()} Alta GULA
        </p>
      </div>
    </footer>
  )
}
