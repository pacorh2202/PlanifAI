
import { 
  MapPin, Clock, Check, Coffee, Mail, Users, AlarmClock, Utensils, Phone, 
  Activity, Dumbbell, BarChart3, Leaf, BookOpen, Star, Music, Camera, 
  Heart, Briefcase, Trophy, Gamepad2, Bike, GraduationCap, Laptop, 
  ShoppingBag, Plane, Car, Brush, Code, Zap, Target, Sun, Umbrella, 
  Wallet, Pill, Smile, MessageCircle, Mic, Video, Home, Building, Trees, Dog 
} from 'lucide-react';
import { EventType, CalendarEvent } from "./types";

export const APP_NAME = "PlanifAI";

export const CATEGORY_COLORS: Record<EventType, string> = {
  work: "bg-blue-400",
  study: "bg-indigo-400",
  health: "bg-teal-400",
  personal: "bg-rose-400",
  leisure: "bg-amber-400",
  other: "bg-slate-400",
};

// DICCIONARIO MAESTRO DE ICONOS
export const ICON_MAP: Record<string, any> = {
  Dumbbell, Star, Bike, Trophy, Users, Heart, Utensils, 
  Coffee, Leaf, BookOpen, GraduationCap, Briefcase, Music, Camera, 
  Gamepad2, MapPin, Laptop, ShoppingBag, Plane, Car, Brush, Code, Zap, 
  Target, Sun, Umbrella, Wallet, Pill, Smile, MessageCircle, Mic, Video, 
  Home, Building, Trees, Dog, BarChart3, Mail, AlarmClock, Activity, Phone
};

// Iniciamos con array vacío para que el usuario tenga su propio espacio desde el principio
export const MOCK_INITIAL_EVENTS: CalendarEvent[] = [];
