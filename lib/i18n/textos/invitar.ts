import { definirTextos } from "../definir";

// Invita a un amigo (Fase 3).
export default definirTextos(
  {
    abrir: "Invitar a un amigo",
    titulo: "Invita a un amigo",
    intro: "Comparte tu código. Cuando un amigo nuevo lo canjee, ganáis saldo los dos.",
    tuCodigo: "Tu código",
    copiar: "Copiar",
    copiado: "¡Código copiado!",
    compartir: "Compartir",
    compartirTexto: (codigo: string) =>
      `Únete a Beraun Fantasy y usa mi código ${codigo}: ganamos saldo los dos.`,
    invitados: (n: number) => `Has traído a ${n} ${n === 1 ? "amigo" : "amigos"}`,
    canjearTitulo: "¿Tienes un código?",
    canjearIntro: "Si acabas de empezar, canjea el código de quien te invitó.",
    canjearPlaceholder: "Código del amigo",
    canjearBoton: "Canjear",
    canjeadoOk: (rec: number) => `¡Canjeado! +${rec} M para los dos.`,
    error: "No se ha podido canjear el código.",
  },
  {
    eu: {
      abrir: "Gonbidatu lagun bat",
      titulo: "Gonbidatu lagun bat",
      intro: "Partekatu zure kodea. Lagun berri batek erabiltzean, biok irabaziko duzue saldoa.",
      tuCodigo: "Zure kodea",
      copiar: "Kopiatu",
      copiado: "Kodea kopiatuta!",
      compartir: "Partekatu",
      compartirTexto: (codigo: string) =>
        `Sartu Beraun Fantasyn eta erabili nire ${codigo} kodea: biok saldoa irabaziko dugu.`,
      invitados: (n: number) => `${n} lagun ekarri dituzu`,
      canjearTitulo: "Koderik baduzu?",
      canjearIntro: "Hasi berri bazara, erabili gonbidatu zaituenaren kodea.",
      canjearPlaceholder: "Lagunaren kodea",
      canjearBoton: "Erabili",
      canjeadoOk: (rec: number) => `Erabilita! +${rec} M biontzat.`,
      error: "Ezin izan da kodea erabili.",
    },
    en: {
      abrir: "Invite a friend",
      titulo: "Invite a friend",
      intro: "Share your code. When a new friend redeems it, you both earn balance.",
      tuCodigo: "Your code",
      copiar: "Copy",
      copiado: "Code copied!",
      compartir: "Share",
      compartirTexto: (codigo: string) =>
        `Join Beraun Fantasy and use my code ${codigo}: we both earn balance.`,
      invitados: (n: number) => `You've brought ${n} ${n === 1 ? "friend" : "friends"}`,
      canjearTitulo: "Got a code?",
      canjearIntro: "If you just started, redeem the code of whoever invited you.",
      canjearPlaceholder: "Friend's code",
      canjearBoton: "Redeem",
      canjeadoOk: (rec: number) => `Redeemed! +${rec} M for both.`,
      error: "Couldn't redeem the code.",
    },
  }
);
