import {
  AlarmClock, ArrowDownAZ, Ban, Bell, BellOff, BookOpen, Calendar, Camera, ChartColumn, ChartLine, Circle, CircleCheck,
  CircleHelp, Clipboard, Compass, Dices, Download, Eraser, Eye, FileText, Flag, FlaskConical, Folder, FolderOpen,
  Footprints, Gift, Hash, House, IdCard, Image, Info, KeyRound, Library, Lightbulb, Link, Lock, LockOpen, LogOut,
  Magnet, Mail, Map, MapPin, Megaphone, MessageCircle, Mountain, PanelLeft, Pause, Pencil, PenLine, Phone, Play,
  Printer, Radio, RefreshCw, Rocket, Scan, Send, Settings, Share2, Shuffle, SkipForward, Sparkles, Spline, Square,
  SquareCheckBig, Timer, Trash2, TriangleAlert, Trophy, Tv, Type, Undo2, Users, Video, Vote,
  Bomb, Clapperboard, Hourglass, Palette, Pin, Plus, Pointer, Rewind, Route, Save, Scissors, Tag, Zap, ArrowRight, Target, Repeat, Check, ChevronLeft, X, Maximize,
  type LucideIcon,
} from "lucide-react";

// Lijn-iconen op de knoppen in het beheer (zelfde stijl als het menu, uit lucide-react). Ze nemen de
// tekstkleur van de knop over en schalen mee met de lettergrootte.
const ICONEN = {
  alarm: AlarmClock, alfabet: ArrowDownAZ, verboden: Ban, bel: Bell, "bel-uit": BellOff, handleiding: BookOpen,
  kalender: Calendar, camera: Camera, statistiek: ChartColumn, grafiek: ChartLine, rondje: Circle, goed: CircleCheck,
  vraag: CircleHelp, klembord: Clipboard, kompas: Compass, dobbelsteen: Dices, downloaden: Download, opruimen: Eraser,
  bekijken: Eye, rapport: FileText, vlag: Flag, testen: FlaskConical, map: Folder, openen: FolderOpen, lopen: Footprints,
  items: Gift, getal: Hash, thuis: House, spelerskaart: IdCard, foto: Image, info: Info, sleutel: KeyRound,
  vragenbank: Library, tip: Lightbulb, link: Link, slot: Lock, "slot-open": LockOpen, uitloggen: LogOut, magneet: Magnet,
  mail: Mail, kaart: Map, punt: MapPin, bericht: Megaphone, chat: MessageCircle, schuin: Mountain, lijst: PanelLeft,
  pauze: Pause, bewerken: Pencil, notitie: PenLine, bellen: Phone, verder: Play, printen: Printer, live: Radio,
  vernieuwen: RefreshCw, starten: Rocket, inbeeld: Scan, versturen: Send, instellingen: Settings, delen: Share2,
  husselen: Shuffle, vrijgeven: SkipForward, nieuw: Sparkles, sporen: Spline, stoppen: Square, vierkant: Square,
  meerdere: SquareCheckBig, tijd: Timer, wissen: Trash2, waarschuwing: TriangleAlert, uitslag: Trophy, beamer: Tv,
  tekst: Type, terug: Undo2, spelers: Users, meebewegen: Video, stemmen: Vote,
  bom: Bomb, film: Clapperboard, laden: Hourglass, palet: Palette, pin: Pin, plus: Plus, aanwijzen: Pointer, replay: Rewind,
  weg: Route, opslaan: Save, knippen: Scissors, label: Tag, bezig: Zap, volgende: ArrowRight, doel: Target, herhalen: Repeat,
  start: Play, vorige: ChevronLeft, klaar: Check, fout: X, centreren: Maximize,
} satisfies Record<string, LucideIcon>;

export type IcoonNaam = keyof typeof ICONEN;

export default function Icoon({ naam }: { naam: IcoonNaam }) {
  const Svg = ICONEN[naam];
  return <span aria-hidden className={`knop-svg knop-svg--${naam}`}><Svg strokeWidth={2} /></span>;
}
