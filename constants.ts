
import {
  // General
  List, Bookmark, Pin, Gift, Cake, GraduationCap,
  // Objects
  Backpack, Ruler, FileText, Book, Wallet, CreditCard, Banknote,
  // Activities
  Dumbbell, PersonStanding as Run, Utensils, Wine, Pill, Stethoscope, Armchair as Chair,
  // Places
  Home, Building, Landmark, Tent, Tv, Music, Monitor,
  // Leisure
  Gamepad2, Headphones, Leaf, Carrot, User as Person, Users, Baby as Family,
  // Animals
  PawPrint, Cat as TeddyBear, Fish, ShoppingBasket, ShoppingCart, ShoppingBag, Box,
  // Sports
  Disc as SoccerBall, Circle as Baseball, Trophy, Medal, Train, Plane,
  // Nature
  Ship as Sailboat, Car, Umbrella, Sun, Moon, Droplet, Snowflake,
  // Tools
  Flame, Briefcase, Wrench, Scissors, Compass, Code, Lightbulb,
  // Misc
  MessageCircle, AlertTriangle as Alert, Asterisk, Square, Circle, Triangle, Diamond, Heart, Star,
  // Existing & Extra
  MapPin, Clock, Check, Coffee, Mail, AlarmClock, Phone, Activity, BarChart3, BookOpen, Camera,
  Bike, Laptop, Brush, Zap, Target, Video, Trees, Dog, Mic, Smile, Palette,
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
  // General
  List, Bookmark, Pin, Gift, Cake, GraduationCap,
  // Objects
  Backpack, Ruler, FileText, Book, Wallet, CreditCard, Banknote,
  // Activities
  Dumbbell, Run, Utensils, Wine, Pill, Stethoscope, Chair,
  // Places
  Home, Building, Landmark, Tent, Tv, Music, Monitor,
  // Leisure
  Gamepad2, Headphones, Leaf, Carrot, Person, Users, Family,
  // Animals
  PawPrint, TeddyBear, Fish, ShoppingBasket, ShoppingCart, ShoppingBag, Box,
  // Sports
  SoccerBall, Baseball, Trophy, Medal, Train, Plane,
  // Nature
  Sailboat, Car, Umbrella, Sun, Moon, Droplet, Snowflake,
  // Tools
  Flame, Briefcase, Wrench, Scissors, Compass, Code, Lightbulb,
  // Misc
  MessageCircle, Alert, Asterisk, Square, Circle, Triangle, Diamond, Heart, Star,
  // Existing / Extra
  MapPin, Clock, Check, Coffee, Mail, AlarmClock, Phone, Activity, BarChart3, BookOpen, Camera,
  Bike, Laptop, Brush, Zap, Target, Video, Trees, Dog, Mic, Smile, Palette
};

// Iniciamos con array vacío para que el usuario tenga su propio espacio desde el principio
export const MOCK_INITIAL_EVENTS: CalendarEvent[] = [];
