import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashbaord',
  standalone: true,
  imports: [],
  templateUrl: './admin-dashbaord.component.html',
  styleUrl: './admin-dashbaord.component.css'
})
export class AdminDashbaordComponent {
  tabs = [
    { label: 'Pending', value: 'pending', color: '#f8d7da' },
    { label: 'In Progress', value: 'inProgress', color: '#fff3cd' },
    { label: 'Resolved', value: 'resolved', color: '#d4edda' }
  ];
  selectedTab = 'pending';

  posts = [
    {
      id: 1,
      user: 'SHIMENET JEJE',
      status: 'pending',
      category: 'Road Damage',
      location: 'Sta Rita',
      description: 'A pothole has formed in this area, causing a potential hazard for vehicles and pedestrians. The road surface is damaged, with a visible hole that may grow larger if not addressed. This issue could lead to accidents, and traffic disruptions.',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
      upvotes: 27,
      downvotes: 10
    },
    // Add more sample posts with different statuses as needed
  ];

  get filteredPosts() {
    return this.posts.filter(post => post.status === this.selectedTab);
  }

  selectTab(tabValue: string) {
    this.selectedTab = tabValue;
  }

  getTabColor(status: string): string {
    const tab = this.tabs.find(t => t.value === status);
    return tab ? tab.color : '#fff';
  }

  getTabLabel(status: string): string {
    const tab = this.tabs.find(t => t.value === status);
    return tab ? tab.label : '';
  }
}
