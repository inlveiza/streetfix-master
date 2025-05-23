export interface Report {
  id: string;
  username: string;
  userAvatar: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  image: string | null;
  category: string;
  location: string;
  description: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  upvotes: number;
  createdAt: Date;
} 