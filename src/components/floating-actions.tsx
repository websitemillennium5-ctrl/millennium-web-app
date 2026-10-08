import { WhatsAppIcon } from "@/components/icons";
import { whatsappHref } from "@/lib/site";

export function FloatingActions() {
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-5 bottom-5 z-[70] flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
