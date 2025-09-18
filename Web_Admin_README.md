# Pothole Detection Web Admin Dashboard

A comprehensive web-based administration panel for managing and visualizing pothole detection data collected from mobile devices.

## Features

- **Real-time Dashboard**: Live statistics and detection monitoring
- **Interactive Maps**: Google Maps integration with pothole markers
- **Data Management**: View, search, filter, and export detection data
- **Analytics**: Charts and graphs showing detection trends
- **CSV Export**: Download detection data for analysis
- **User Management**: Monitor active users and their activity
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Chart.js for data visualization
- **Maps**: Google Maps JavaScript API
- **Styling**: Custom CSS with modern design principles
- **Data**: Firebase Firestore integration
- **Icons**: Font Awesome

## Setup Instructions

### 1. Firebase Configuration
1. Update Firebase configuration in `admin-dashboard.js`
2. Configure Firestore security rules for admin access
3. Set up admin user authentication

### 2. Google Maps API
1. Get Google Maps JavaScript API key
2. Replace `YOUR_API_KEY` in HTML file
3. Enable Maps JavaScript API in Google Cloud Console

### 3. Deployment
1. Upload files to web server
2. Configure HTTPS (required for location services)
3. Set up Firebase hosting (optional)

## File Structure

```
web-admin/
├── admin-dashboard.html       # Main HTML file
├── admin-styles.css          # CSS styles
├── admin-dashboard.js        # JavaScript functionality
└── README.md                # Documentation
```

## Dashboard Sections

### 1. Overview Tab
- **Statistics Cards**: Total potholes, active users, today's detections, average confidence
- **Daily Chart**: Line chart showing detection trends over last 7 days
- **Confidence Distribution**: Pie chart showing detection confidence levels
- **Recent Detections**: List of latest pothole detections

### 2. Map View Tab
- **Interactive Map**: Google Maps with pothole markers
- **Filters**: Date range and confidence level filtering
- **Marker Info**: Click markers for detailed pothole information
- **Controls**: Reset filters, zoom controls

### 3. Data Table Tab
- **Searchable Table**: All pothole detections in tabular format
- **Sorting**: Sort by date, confidence, user, etc.
- **Pagination**: Navigate through large datasets
- **Actions**: View details, delete records
- **Export**: Download as CSV or JSON

### 4. Analytics Tab
- **Trend Analysis**: Monthly detection trends
- **Hotspot Map**: Areas with highest pothole density
- **User Activity**: Detection counts by user
- **Speed Analysis**: Detection patterns by vehicle speed

## Data Visualization

### Charts Available
1. **Daily Detections**: Line chart showing daily trends
2. **Confidence Distribution**: Doughnut chart of confidence levels
3. **Monthly Trends**: Bar chart of monthly detection patterns
4. **Hotspot Areas**: Pie chart of geographic distribution
5. **User Activity**: Horizontal bar chart of user contributions
6. **Speed Analysis**: Line chart of speed vs detections

### Interactive Features
- **Hover Effects**: Show detailed information on hover
- **Click Events**: Navigate between related data
- **Responsive**: Adapt to different screen sizes
- **Real-time Updates**: Live data refresh capabilities

## Authentication

### Admin Login
- Email/password authentication
- Demo credentials: `admin@example.com` / `admin123`
- Session management with logout functionality
- Secure admin-only access

### Security Features
- Firebase security rules for admin access
- Input validation and sanitization
- HTTPS enforcement
- Session timeout handling

## Data Export

### CSV Export
Exports filtered data with columns:
- ID, Timestamp, Latitude, Longitude
- Confidence, Speed, User Name, User Email
- Accelerometer X, Y, Z values

### JSON Export
Complete data structure export including:
- All detection metadata
- Nested accelerometer data
- User information
- Formatted for API consumption

## Responsive Design

### Desktop (1200px+)
- Full sidebar navigation
- Multi-column layouts
- Large charts and maps
- Complete data tables

### Tablet (768px - 1199px)
- Collapsible navigation
- Stacked chart layouts
- Scrollable tables
- Touch-friendly interface

### Mobile (< 768px)
- Bottom navigation
- Single-column layouts
- Simplified charts
- Mobile-optimized tables

## Customization

### Styling
- CSS custom properties for easy theming
- Modular CSS architecture
- Consistent design system
- Brand color customization

### Functionality
- Configurable data refresh intervals
- Customizable chart types and colors
- Adjustable pagination sizes
- Flexible filtering options

## Performance Optimization

### Loading
- Lazy loading for charts and maps
- Progressive data loading
- Loading indicators
- Error handling

### Data Management
- Client-side filtering and sorting
- Pagination for large datasets
- Efficient DOM updates
- Memory management for charts

## Browser Support

### Supported Browsers
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### Required Features
- ES6+ JavaScript support
- CSS Grid and Flexbox
- Fetch API
- Local Storage

## Deployment Options

### Firebase Hosting
1. Install Firebase CLI
2. Initialize Firebase project
3. Deploy with `firebase deploy`

### Traditional Web Server
1. Upload files to web root
2. Configure HTTPS
3. Set up domain/subdomain

### CDN Deployment
1. Upload to CDN provider
2. Configure caching rules
3. Set up SSL certificate

## Troubleshooting

### Common Issues

1. **Maps Not Loading**
   - Check Google Maps API key
   - Verify API quotas and billing
   - Ensure JavaScript API is enabled

2. **Charts Not Displaying**
   - Verify Chart.js CDN loading
   - Check browser console for errors
   - Validate data format

3. **Data Not Loading**
   - Check Firebase configuration
   - Verify network connectivity
   - Review security rules

4. **Authentication Issues**
   - Validate admin credentials
   - Check Firebase Auth configuration
   - Review browser security settings

### Debug Mode
Enable browser developer tools to monitor:
- Network requests
- JavaScript errors
- Firebase operations
- Performance metrics

## Security Considerations

### Best Practices
- Use HTTPS for all communications
- Implement proper Firebase security rules
- Validate all user inputs
- Regular security updates

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /potholes/{document} {
      allow read, write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## Future Enhancements

- Real-time notifications
- Advanced analytics dashboard
- User role management
- API integration capabilities
- Mobile app for admins
- Automated reporting

## License

This project is licensed under the MIT License.