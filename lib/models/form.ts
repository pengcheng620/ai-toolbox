// Enhanced interface to include more dimensions
export interface PromptOptions {
    platform: 'Instagram' | 'Facebook' | 'Twitter' | 'LinkedIn';
    style: 'Inspirational' | 'Humorous' | 'Formal' | 'Casual';
    purpose: 'Engagement' | 'Awareness' | 'Conversion' | 'Education';
    audience: 'General' | 'Youth' | 'Professionals' | 'Seniors';
    tone: 'Friendly' | 'Authoritative' | 'Playful' | 'Sincere';
    includeSEO: boolean;
    includeCallToAction: boolean;
    includeHashtags?: boolean;
    topic?: string; // Optional specific topic or theme
    textLength?: string; // Optional number of text elements to generate
}

export const PlatformItems = [
    'Instagram',
    'Facebook',
    'Twitter',
    'LinkedIn'
]
export const PurposeItems = {
    'Engagement': 'increase engagement',
    'Awareness': 'raise awareness',
    'Conversion': 'drive conversions',
    'Education': 'educate the audience'
}
export const ToneItems = {
    'Friendly': 'friendly',
    'Authoritative': 'authoritative',
    'Playful': 'playful',
    'Sincere': 'sincere'
}
export const StyleItems = {
    'Inspirational': 'inspirational',
    'Humorous': 'humorous',
    'Formal': 'formal',
    'Casual': 'casual'
}
export const TextLengthItems = [
    "10",
    "15",
    "25",
    "50",
    "80"
]


export const defaultPromptOptions: PromptOptions = {
    platform: 'Instagram',
    style: 'Inspirational',
    purpose: 'Engagement',
    audience: 'General',
    tone: 'Friendly',
    includeSEO: false,
    includeCallToAction: false,
    includeHashtags: false,
    topic: '',
    textLength: '15'
}