'use client';

/**
 * Phase 6 Task 6.2.6: Emoji Picker Component
 * 
 * Comprehensive emoji picker with categories, search,
 * recently used emojis, and keyboard navigation
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Smile,
  Heart,
  Lightbulb,
  Zap,
  Leaf,
  Globe,
  Flag,
  Star,
  Clock
} from 'lucide-react';

export interface EmojiPickerProps {
  onEmojiClick: (emoji: EmojiItem) => void;
  onClose?: () => void;
  className?: string;
  maxRecentEmojis?: number;
  compact?: boolean;
  showSearch?: boolean;
  showCategories?: boolean;
}

export interface EmojiItem {
  emoji: string;
  name: string;
  keywords: string[];
  category: string;
}

// Comprehensive emoji data organized by categories
const EMOJI_DATA: Record<string, EmojiItem[]> = {
  'smileys': [
    { emoji: '😀', name: 'grinning face', keywords: ['happy', 'smile', 'joy'], category: 'smileys' },
    { emoji: '😃', name: 'grinning face with big eyes', keywords: ['happy', 'smile', 'joy'], category: 'smileys' },
    { emoji: '😄', name: 'grinning face with smiling eyes', keywords: ['happy', 'smile', 'joy'], category: 'smileys' },
    { emoji: '😁', name: 'beaming face with smiling eyes', keywords: ['happy', 'smile'], category: 'smileys' },
    { emoji: '😆', name: 'grinning squinting face', keywords: ['laugh', 'happy'], category: 'smileys' },
    { emoji: '😅', name: 'grinning face with sweat', keywords: ['laugh', 'nervous'], category: 'smileys' },
    { emoji: '🤣', name: 'rolling on floor laughing', keywords: ['laugh', 'funny'], category: 'smileys' },
    { emoji: '😂', name: 'face with tears of joy', keywords: ['laugh', 'cry', 'funny'], category: 'smileys' },
    { emoji: '🙂', name: 'slightly smiling face', keywords: ['smile', 'happy'], category: 'smileys' },
    { emoji: '🙃', name: 'upside-down face', keywords: ['smile', 'silly'], category: 'smileys' },
    { emoji: '😉', name: 'winking face', keywords: ['wink', 'flirt'], category: 'smileys' },
    { emoji: '😊', name: 'smiling face with smiling eyes', keywords: ['smile', 'happy', 'blush'], category: 'smileys' },
    { emoji: '😇', name: 'smiling face with halo', keywords: ['angel', 'innocent'], category: 'smileys' },
    { emoji: '😍', name: 'smiling face with heart-eyes', keywords: ['love', 'like'], category: 'smileys' },
    { emoji: '🤩', name: 'star-struck', keywords: ['amazed', 'wow'], category: 'smileys' },
    { emoji: '😘', name: 'face blowing a kiss', keywords: ['kiss', 'love'], category: 'smileys' },
    { emoji: '😗', name: 'kissing face', keywords: ['kiss'], category: 'smileys' },
    { emoji: '😚', name: 'kissing face with closed eyes', keywords: ['kiss'], category: 'smileys' },
    { emoji: '😙', name: 'kissing face with smiling eyes', keywords: ['kiss'], category: 'smileys' },
    { emoji: '😋', name: 'face savoring food', keywords: ['yummy', 'delicious'], category: 'smileys' },
    { emoji: '😛', name: 'face with tongue', keywords: ['tongue', 'silly'], category: 'smileys' },
    { emoji: '😜', name: 'winking face with tongue', keywords: ['tongue', 'wink'], category: 'smileys' },
    { emoji: '🤪', name: 'zany face', keywords: ['crazy', 'silly'], category: 'smileys' },
    { emoji: '😝', name: 'squinting face with tongue', keywords: ['tongue', 'silly'], category: 'smileys' },
    { emoji: '🤑', name: 'money-mouth face', keywords: ['money', 'rich'], category: 'smileys' },
    { emoji: '🤗', name: 'hugging face', keywords: ['hug', 'love'], category: 'smileys' },
    { emoji: '🤭', name: 'face with hand over mouth', keywords: ['oops', 'secret'], category: 'smileys' },
    { emoji: '🤫', name: 'shushing face', keywords: ['quiet', 'secret'], category: 'smileys' },
    { emoji: '🤔', name: 'thinking face', keywords: ['think', 'hmm'], category: 'smileys' },
    { emoji: '🤐', name: 'zipper-mouth face', keywords: ['quiet', 'secret'], category: 'smileys' },
    { emoji: '🤨', name: 'face with raised eyebrow', keywords: ['suspicious', 'questioning'], category: 'smileys' },
    { emoji: '😐', name: 'neutral face', keywords: ['neutral', 'meh'], category: 'smileys' },
    { emoji: '😑', name: 'expressionless face', keywords: ['blank', 'meh'], category: 'smileys' },
    { emoji: '😶', name: 'face without mouth', keywords: ['quiet', 'silent'], category: 'smileys' },
    { emoji: '😏', name: 'smirking face', keywords: ['smirk', 'smug'], category: 'smileys' },
    { emoji: '😒', name: 'unamused face', keywords: ['annoyed', 'meh'], category: 'smileys' },
    { emoji: '🙄', name: 'face with rolling eyes', keywords: ['annoyed', 'whatever'], category: 'smileys' },
    { emoji: '😬', name: 'grimacing face', keywords: ['awkward', 'nervous'], category: 'smileys' },
    { emoji: '🤥', name: 'lying face', keywords: ['lie', 'pinocchio'], category: 'smileys' },
    { emoji: '😔', name: 'pensive face', keywords: ['sad', 'thoughtful'], category: 'smileys' },
    { emoji: '😕', name: 'confused face', keywords: ['confused', 'worried'], category: 'smileys' },
    { emoji: '🙁', name: 'slightly frowning face', keywords: ['sad', 'disappointed'], category: 'smileys' },
    { emoji: '☹️', name: 'frowning face', keywords: ['sad', 'disappointed'], category: 'smileys' },
    { emoji: '😣', name: 'persevering face', keywords: ['struggle', 'persevere'], category: 'smileys' },
    { emoji: '😖', name: 'confounded face', keywords: ['confused', 'frustrated'], category: 'smileys' },
    { emoji: '😫', name: 'tired face', keywords: ['tired', 'exhausted'], category: 'smileys' },
    { emoji: '😩', name: 'weary face', keywords: ['tired', 'weary'], category: 'smileys' },
    { emoji: '🥺', name: 'pleading face', keywords: ['puppy eyes', 'please'], category: 'smileys' },
    { emoji: '😢', name: 'crying face', keywords: ['sad', 'cry'], category: 'smileys' },
    { emoji: '😭', name: 'loudly crying face', keywords: ['cry', 'sob'], category: 'smileys' },
    { emoji: '😤', name: 'face with steam from nose', keywords: ['angry', 'frustrated'], category: 'smileys' },
    { emoji: '😠', name: 'angry face', keywords: ['angry', 'mad'], category: 'smileys' },
    { emoji: '😡', name: 'pouting face', keywords: ['angry', 'rage'], category: 'smileys' },
    { emoji: '🤬', name: 'face with symbols over mouth', keywords: ['swearing', 'angry'], category: 'smileys' },
    { emoji: '🤯', name: 'exploding head', keywords: ['mind blown', 'shocked'], category: 'smileys' },
    { emoji: '😳', name: 'flushed face', keywords: ['embarrassed', 'shy'], category: 'smileys' },
    { emoji: '🥵', name: 'hot face', keywords: ['hot', 'sweating'], category: 'smileys' },
    { emoji: '🥶', name: 'cold face', keywords: ['cold', 'freezing'], category: 'smileys' },
    { emoji: '😱', name: 'face screaming in fear', keywords: ['scared', 'shock'], category: 'smileys' },
    { emoji: '😨', name: 'fearful face', keywords: ['scared', 'afraid'], category: 'smileys' },
    { emoji: '😰', name: 'anxious face with sweat', keywords: ['nervous', 'anxious'], category: 'smileys' },
    { emoji: '😥', name: 'sad but relieved face', keywords: ['relief', 'phew'], category: 'smileys' },
    { emoji: '😓', name: 'downcast face with sweat', keywords: ['tired', 'sad'], category: 'smileys' },
    { emoji: '🤪', name: 'zany face', keywords: ['crazy', 'wild'], category: 'smileys' },
    { emoji: '😵', name: 'dizzy face', keywords: ['dizzy', 'confused'], category: 'smileys' },
    { emoji: '😪', name: 'sleepy face', keywords: ['tired', 'sleepy'], category: 'smileys' },
    { emoji: '🤤', name: 'drooling face', keywords: ['drool', 'want'], category: 'smileys' },
    { emoji: '😴', name: 'sleeping face', keywords: ['sleep', 'zzz'], category: 'smileys' }
  ],
  'gestures': [
    { emoji: '👍', name: 'thumbs up', keywords: ['like', 'good', 'yes'], category: 'gestures' },
    { emoji: '👎', name: 'thumbs down', keywords: ['dislike', 'bad', 'no'], category: 'gestures' },
    { emoji: '👌', name: 'OK hand', keywords: ['ok', 'perfect'], category: 'gestures' },
    { emoji: '✌️', name: 'victory hand', keywords: ['peace', 'victory'], category: 'gestures' },
    { emoji: '🤞', name: 'crossed fingers', keywords: ['hope', 'luck'], category: 'gestures' },
    { emoji: '🤟', name: 'love-you gesture', keywords: ['love', 'rock'], category: 'gestures' },
    { emoji: '🤘', name: 'sign of horns', keywords: ['rock', 'metal'], category: 'gestures' },
    { emoji: '🤙', name: 'call me hand', keywords: ['call', 'phone'], category: 'gestures' },
    { emoji: '👈', name: 'backhand index pointing left', keywords: ['left', 'point'], category: 'gestures' },
    { emoji: '👉', name: 'backhand index pointing right', keywords: ['right', 'point'], category: 'gestures' },
    { emoji: '👆', name: 'backhand index pointing up', keywords: ['up', 'point'], category: 'gestures' },
    { emoji: '👇', name: 'backhand index pointing down', keywords: ['down', 'point'], category: 'gestures' },
    { emoji: '☝️', name: 'index pointing up', keywords: ['up', 'one'], category: 'gestures' },
    { emoji: '✋', name: 'raised hand', keywords: ['stop', 'high five'], category: 'gestures' },
    { emoji: '🤚', name: 'raised back of hand', keywords: ['stop', 'back'], category: 'gestures' },
    { emoji: '🖐️', name: 'hand with fingers splayed', keywords: ['five', 'hand'], category: 'gestures' },
    { emoji: '🖖', name: 'vulcan salute', keywords: ['spock', 'star trek'], category: 'gestures' },
    { emoji: '👋', name: 'waving hand', keywords: ['hello', 'goodbye', 'wave'], category: 'gestures' },
    { emoji: '🤝', name: 'handshake', keywords: ['deal', 'agreement'], category: 'gestures' },
    { emoji: '🙏', name: 'folded hands', keywords: ['prayer', 'thanks'], category: 'gestures' },
    { emoji: '✍️', name: 'writing hand', keywords: ['write', 'author'], category: 'gestures' },
    { emoji: '👏', name: 'clapping hands', keywords: ['applause', 'congrats'], category: 'gestures' },
    { emoji: '🙌', name: 'raising hands', keywords: ['celebration', 'hooray'], category: 'gestures' },
    { emoji: '👐', name: 'open hands', keywords: ['open', 'hug'], category: 'gestures' },
    { emoji: '🤲', name: 'palms up together', keywords: ['prayer', 'cupping'], category: 'gestures' },
    { emoji: '🤜', name: 'right-facing fist', keywords: ['fist', 'punch'], category: 'gestures' },
    { emoji: '🤛', name: 'left-facing fist', keywords: ['fist', 'punch'], category: 'gestures' },
    { emoji: '✊', name: 'raised fist', keywords: ['power', 'strength'], category: 'gestures' }
  ],
  'emotions': [
    { emoji: '❤️', name: 'red heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '🧡', name: 'orange heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💛', name: 'yellow heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💚', name: 'green heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💙', name: 'blue heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💜', name: 'purple heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '🖤', name: 'black heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '🤍', name: 'white heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '🤎', name: 'brown heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💔', name: 'broken heart', keywords: ['breakup', 'sad'], category: 'emotions' },
    { emoji: '❣️', name: 'heart exclamation', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💕', name: 'two hearts', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💞', name: 'revolving hearts', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💓', name: 'beating heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💗', name: 'growing heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💖', name: 'sparkling heart', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '💘', name: 'heart with arrow', keywords: ['love', 'cupid'], category: 'emotions' },
    { emoji: '💝', name: 'heart with ribbon', keywords: ['love', 'gift'], category: 'emotions' },
    { emoji: '💟', name: 'heart decoration', keywords: ['love', 'heart'], category: 'emotions' },
    { emoji: '☮️', name: 'peace symbol', keywords: ['peace'], category: 'emotions' },
    { emoji: '✝️', name: 'latin cross', keywords: ['religion'], category: 'emotions' },
    { emoji: '☪️', name: 'star and crescent', keywords: ['religion'], category: 'emotions' },
    { emoji: '🕉️', name: 'om', keywords: ['religion'], category: 'emotions' },
    { emoji: '☸️', name: 'wheel of dharma', keywords: ['religion'], category: 'emotions' },
    { emoji: '✡️', name: 'star of david', keywords: ['religion'], category: 'emotions' },
    { emoji: '🔯', name: 'dotted six-pointed star', keywords: ['religion'], category: 'emotions' },
    { emoji: '🕎', name: 'menorah', keywords: ['religion'], category: 'emotions' },
    { emoji: '☯️', name: 'yin yang', keywords: ['balance'], category: 'emotions' }
  ],
  'objects': [
    { emoji: '💻', name: 'laptop', keywords: ['computer', 'tech'], category: 'objects' },
    { emoji: '🖥️', name: 'desktop computer', keywords: ['computer', 'tech'], category: 'objects' },
    { emoji: '🖨️', name: 'printer', keywords: ['print', 'office'], category: 'objects' },
    { emoji: '⌨️', name: 'keyboard', keywords: ['type', 'computer'], category: 'objects' },
    { emoji: '🖱️', name: 'computer mouse', keywords: ['click', 'computer'], category: 'objects' },
    { emoji: '📱', name: 'mobile phone', keywords: ['phone', 'cell'], category: 'objects' },
    { emoji: '☎️', name: 'telephone', keywords: ['phone', 'call'], category: 'objects' },
    { emoji: '📞', name: 'telephone receiver', keywords: ['phone', 'call'], category: 'objects' },
    { emoji: '📟', name: 'pager', keywords: ['message', 'beeper'], category: 'objects' },
    { emoji: '📠', name: 'fax machine', keywords: ['fax', 'office'], category: 'objects' },
    { emoji: '📺', name: 'television', keywords: ['tv', 'watch'], category: 'objects' },
    { emoji: '📻', name: 'radio', keywords: ['music', 'listen'], category: 'objects' },
    { emoji: '🎵', name: 'musical note', keywords: ['music', 'sound'], category: 'objects' },
    { emoji: '🎶', name: 'musical notes', keywords: ['music', 'sound'], category: 'objects' },
    { emoji: '🎤', name: 'microphone', keywords: ['sing', 'record'], category: 'objects' },
    { emoji: '🎧', name: 'headphone', keywords: ['music', 'listen'], category: 'objects' },
    { emoji: '📢', name: 'loudspeaker', keywords: ['announce', 'loud'], category: 'objects' },
    { emoji: '📣', name: 'megaphone', keywords: ['announce', 'loud'], category: 'objects' },
    { emoji: '📯', name: 'postal horn', keywords: ['horn', 'mail'], category: 'objects' },
    { emoji: '🔔', name: 'bell', keywords: ['ring', 'notification'], category: 'objects' },
    { emoji: '🔕', name: 'bell with slash', keywords: ['mute', 'silent'], category: 'objects' },
    { emoji: '📯', name: 'postal horn', keywords: ['horn', 'post'], category: 'objects' },
    { emoji: '🎺', name: 'trumpet', keywords: ['music', 'brass'], category: 'objects' },
    { emoji: '📊', name: 'bar chart', keywords: ['chart', 'data'], category: 'objects' },
    { emoji: '📈', name: 'chart increasing', keywords: ['chart', 'growth'], category: 'objects' },
    { emoji: '📉', name: 'chart decreasing', keywords: ['chart', 'decline'], category: 'objects' }
  ],
  'nature': [
    { emoji: '🌱', name: 'seedling', keywords: ['plant', 'grow'], category: 'nature' },
    { emoji: '🌿', name: 'herb', keywords: ['plant', 'green'], category: 'nature' },
    { emoji: '☘️', name: 'shamrock', keywords: ['luck', 'irish'], category: 'nature' },
    { emoji: '🍀', name: 'four leaf clover', keywords: ['luck', 'irish'], category: 'nature' },
    { emoji: '🎋', name: 'tanabata tree', keywords: ['tree', 'bamboo'], category: 'nature' },
    { emoji: '🎍', name: 'pine decoration', keywords: ['plant', 'pine'], category: 'nature' },
    { emoji: '🌾', name: 'sheaf of rice', keywords: ['plant', 'rice'], category: 'nature' },
    { emoji: '🌵', name: 'cactus', keywords: ['plant', 'desert'], category: 'nature' },
    { emoji: '🌲', name: 'evergreen tree', keywords: ['tree', 'christmas'], category: 'nature' },
    { emoji: '🌳', name: 'deciduous tree', keywords: ['tree', 'nature'], category: 'nature' },
    { emoji: '🌴', name: 'palm tree', keywords: ['tree', 'tropical'], category: 'nature' },
    { emoji: '🌸', name: 'cherry blossom', keywords: ['flower', 'spring'], category: 'nature' },
    { emoji: '🌺', name: 'hibiscus', keywords: ['flower', 'tropical'], category: 'nature' },
    { emoji: '🌻', name: 'sunflower', keywords: ['flower', 'yellow'], category: 'nature' },
    { emoji: '🌹', name: 'rose', keywords: ['flower', 'love'], category: 'nature' },
    { emoji: '🌷', name: 'tulip', keywords: ['flower', 'spring'], category: 'nature' },
    { emoji: '🌼', name: 'blossom', keywords: ['flower', 'daisy'], category: 'nature' },
    { emoji: '💐', name: 'bouquet', keywords: ['flower', 'gift'], category: 'nature' },
    { emoji: '🍄', name: 'mushroom', keywords: ['fungi', 'toadstool'], category: 'nature' },
    { emoji: '🌰', name: 'chestnut', keywords: ['nut', 'autumn'], category: 'nature' },
    { emoji: '🦋', name: 'butterfly', keywords: ['insect', 'beautiful'], category: 'nature' },
    { emoji: '🐛', name: 'bug', keywords: ['insect', 'caterpillar'], category: 'nature' },
    { emoji: '🐝', name: 'honeybee', keywords: ['bee', 'honey'], category: 'nature' },
    { emoji: '🐞', name: 'lady beetle', keywords: ['bug', 'ladybug'], category: 'nature' },
    { emoji: '🦗', name: 'cricket', keywords: ['insect', 'chirp'], category: 'nature' },
    { emoji: '🕷️', name: 'spider', keywords: ['arachnid', 'web'], category: 'nature' }
  ],
  'travel': [
    { emoji: '🚗', name: 'car', keywords: ['vehicle', 'drive'], category: 'travel' },
    { emoji: '🚕', name: 'taxi', keywords: ['vehicle', 'cab'], category: 'travel' },
    { emoji: '🚙', name: 'SUV', keywords: ['vehicle', 'car'], category: 'travel' },
    { emoji: '🚌', name: 'bus', keywords: ['vehicle', 'public'], category: 'travel' },
    { emoji: '🚎', name: 'trolleybus', keywords: ['vehicle', 'public'], category: 'travel' },
    { emoji: '🏎️', name: 'racing car', keywords: ['vehicle', 'fast'], category: 'travel' },
    { emoji: '🚓', name: 'police car', keywords: ['vehicle', 'police'], category: 'travel' },
    { emoji: '🚑', name: 'ambulance', keywords: ['vehicle', 'medical'], category: 'travel' },
    { emoji: '🚒', name: 'fire engine', keywords: ['vehicle', 'firefighter'], category: 'travel' },
    { emoji: '🚐', name: 'minibus', keywords: ['vehicle', 'van'], category: 'travel' },
    { emoji: '🚚', name: 'delivery truck', keywords: ['vehicle', 'truck'], category: 'travel' },
    { emoji: '🚛', name: 'articulated lorry', keywords: ['vehicle', 'truck'], category: 'travel' },
    { emoji: '🚜', name: 'tractor', keywords: ['vehicle', 'farm'], category: 'travel' },
    { emoji: '🏍️', name: 'motorcycle', keywords: ['vehicle', 'bike'], category: 'travel' },
    { emoji: '🛵', name: 'motor scooter', keywords: ['vehicle', 'scooter'], category: 'travel' },
    { emoji: '🚲', name: 'bicycle', keywords: ['vehicle', 'bike'], category: 'travel' },
    { emoji: '🛴', name: 'kick scooter', keywords: ['vehicle', 'scooter'], category: 'travel' },
    { emoji: '🚁', name: 'helicopter', keywords: ['aircraft', 'fly'], category: 'travel' },
    { emoji: '✈️', name: 'airplane', keywords: ['aircraft', 'fly'], category: 'travel' },
    { emoji: '🛩️', name: 'small airplane', keywords: ['aircraft', 'fly'], category: 'travel' },
    { emoji: '🚀', name: 'rocket', keywords: ['space', 'fast'], category: 'travel' },
    { emoji: '🛸', name: 'flying saucer', keywords: ['ufo', 'alien'], category: 'travel' },
    { emoji: '🚢', name: 'ship', keywords: ['boat', 'ocean'], category: 'travel' },
    { emoji: '⛵', name: 'sailboat', keywords: ['boat', 'sail'], category: 'travel' },
    { emoji: '🛥️', name: 'motor boat', keywords: ['boat', 'speed'], category: 'travel' },
    { emoji: '🚤', name: 'speedboat', keywords: ['boat', 'fast'], category: 'travel' }
  ]
};

const CATEGORY_INFO = {
  smileys: { name: 'Smileys & Emotion', icon: Smile },
  gestures: { name: 'People & Body', icon: Star },
  emotions: { name: 'Hearts & Symbols', icon: Heart },
  objects: { name: 'Objects', icon: Lightbulb },
  nature: { name: 'Animals & Nature', icon: Leaf },
  travel: { name: 'Travel & Places', icon: Globe }
};

// Local storage key for recent emojis
const RECENT_EMOJIS_KEY = 'recentEmojis';

export function EmojiPicker({
  onEmojiClick,
  onClose,
  className,
  maxRecentEmojis = 24,
  compact = false,
  showSearch = true,
  showCategories = true
}: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<EmojiItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Load recent emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
      if (stored) {
        setRecentEmojis(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load recent emojis:', error);
    }
  }, []);
  
  // Save recent emojis to localStorage
  const saveRecentEmojis = useCallback((emojis: EmojiItem[]) => {
    try {
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(emojis.slice(0, maxRecentEmojis)));
    } catch (error) {
      console.warn('Failed to save recent emojis:', error);
    }
  }, [maxRecentEmojis]);
  
  // Handle emoji selection
  const handleEmojiClick = useCallback((emoji: EmojiItem) => {
    // Add to recent emojis
    const newRecent = [emoji, ...recentEmojis.filter(e => e.emoji !== emoji.emoji)].slice(0, maxRecentEmojis);
    setRecentEmojis(newRecent);
    saveRecentEmojis(newRecent);
    
    onEmojiClick(emoji);
  }, [recentEmojis, maxRecentEmojis, saveRecentEmojis, onEmojiClick]);
  
  // Search emojis
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase().trim();
    const results: EmojiItem[] = [];
    
    Object.values(EMOJI_DATA).flat().forEach(emoji => {
      const matchesName = emoji.name.toLowerCase().includes(query);
      const matchesKeywords = emoji.keywords.some(keyword => keyword.toLowerCase().includes(query));
      
      if (matchesName || matchesKeywords) {
        results.push(emoji);
      }
    });
    
    return results.slice(0, 48); // Limit results
  }, [searchQuery]);
  
  // Focus search input on mount
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  }, [onClose]);
  
  const emojiGridClasses = cn(
    "grid gap-1 p-3",
    compact ? "grid-cols-8" : "grid-cols-8 sm:grid-cols-10"
  );
  
  const emojiButtonClasses = cn(
    "aspect-square flex items-center justify-center rounded hover:bg-accent transition-colors",
    compact ? "text-lg" : "text-xl"
  );
  
  return (
    <Card className={cn("w-80", compact && "w-64", className)} onKeyDown={handleKeyDown}>
      
      {/* Header */}
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center space-x-2">
          <Smile className="h-4 w-4" />
          <span>Emoji</span>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-auto p-1 h-6 w-6"
            >
              ×
            </Button>
          )}
        </CardTitle>
        
        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emoji..."
              className="pl-7 h-8 text-sm"
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        
        {/* Search Results */}
        {searchQuery && (
          <div className="max-h-48 overflow-y-auto">
            {searchResults.length > 0 ? (
              <div className={emojiGridClasses}>
                {searchResults.map((emoji) => (
                  <Button
                    key={emoji.emoji}
                    variant="ghost"
                    className={emojiButtonClasses}
                    onClick={() => handleEmojiClick(emoji)}
                    title={emoji.name}
                  >
                    {emoji.emoji}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No emoji found</p>
              </div>
            )}
          </div>
        )}
        
        {/* Main Content */}
        {!searchQuery && (
          <div className="h-64 flex flex-col">
            
            {/* Categories */}
            {showCategories && (
              <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1">
                <TabsList className="w-full justify-start rounded-none border-b h-10 bg-transparent p-0">
                  {recentEmojis.length > 0 && (
                    <TabsTrigger value="recent" className="p-2" title="Recently Used">
                      <Clock className="h-4 w-4" />
                    </TabsTrigger>
                  )}
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <TabsTrigger key={key} value={key} className="p-2" title={info.name}>
                      <info.icon className="h-4 w-4" />
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {/* Recent Emojis */}
                {recentEmojis.length > 0 && (
                  <TabsContent value="recent" className="mt-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className={emojiGridClasses}>
                        {recentEmojis.map((emoji) => (
                          <Button
                            key={`recent-${emoji.emoji}`}
                            variant="ghost"
                            className={emojiButtonClasses}
                            onClick={() => handleEmojiClick(emoji)}
                            title={emoji.name}
                          >
                            {emoji.emoji}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                )}
                
                {/* Category Content */}
                {Object.entries(EMOJI_DATA).map(([category, emojis]) => (
                  <TabsContent key={category} value={category} className="mt-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className={emojiGridClasses}>
                        {emojis.map((emoji) => (
                          <Button
                            key={emoji.emoji}
                            variant="ghost"
                            className={emojiButtonClasses}
                            onClick={() => handleEmojiClick(emoji)}
                            title={emoji.name}
                          >
                            {emoji.emoji}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}
            
            {/* No Categories - Show All */}
            {!showCategories && (
              <ScrollArea className="flex-1">
                <div className={emojiGridClasses}>
                  {Object.values(EMOJI_DATA).flat().map((emoji) => (
                    <Button
                      key={emoji.emoji}
                      variant="ghost"
                      className={emojiButtonClasses}
                      onClick={() => handleEmojiClick(emoji)}
                      title={emoji.name}
                    >
                      {emoji.emoji}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
            
          </div>
        )}
        
      </CardContent>
    </Card>
  );
}

export default EmojiPicker;
