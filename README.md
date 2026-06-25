
# iDonate Mobile App

A cross-platform mobile application built with React Native + Expo that connects voluntary blood donors with verified healthcare institutions.

## Features

- **User Authentication**: Email/password login and Google sign-in
- **Donor Profiles**: Manage personal info, blood type, eligibility, and location
- **Blood Request Search**: Find nearby urgent blood requests
- **Donation Scheduling**: Book appointments with verified institutions
- **Geospatial Matching**: Uses GPS to match donors with nearby requests
- **Push Notifications**: Real-time alerts for urgent requests and messages
- **In-App Messaging**: Chat with institutions about scheduled donations
- **Offline Support**: Cached data for offline viewing
- **Eligibility Tracking**: Automatic 90-day cooldown period after donation

## Tech Stack

- **React Native 0.81.5**: Cross-platform mobile framework
- **Expo 54 SDK**: Development platform for React Native
- **Expo Router**: File-based routing
- **Expo Location**: GPS tracking
- **Expo Notifications**: Push notifications
- **React Native Maps**: Interactive maps
- **Supabase**: Backend (Auth, Database, Realtime, Storage)
- **TypeScript**: Type-safe development

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- A Supabase project
- Android Studio (for Android development) or Xcode (for iOS development)

## Setup Instructions

1. **Clone the repository and navigate to the app directory**:
   ```bash
   cd iDonate-App
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Fill in your Supabase project URL and anon key in `.env`

4. **Set up Supabase**:
   - Create a new project at [supabase.com](https://supabase.com)
   - Run all database migrations from the `../supabase/` directory
   - Enable PostGIS extension
   - Set up a Storage bucket for profile pictures and documents

5. **Start the development server**:
   ```bash
   npm start
   ```

6. **Run on device/simulator**:
   - For Android:
     ```bash
     npm run android
     ```
   - For iOS:
     ```bash
     npm run ios
     ```

## Project Structure

```
iDonate-App/
├── app/                      # Expo Router pages
│   ├── (tabs)/               # Bottom tab navigation
│   │   ├── index.tsx         # Home dashboard
│   │   ├── donations.tsx     # Donation history
│   │   ├── requests.tsx      # Blood requests
│   │   ├── map.tsx           # Nearby institutions map
│   │   └── profile.tsx       # Profile page
│   ├── blood-request/        # Request detail pages
│   ├── chat.tsx              # Messaging page
│   ├── donate-blood.tsx      # Donation scheduling
│   ├── edit-profile.tsx      # Profile editing
│   ├── notifications.tsx     # Notifications list
│   ├── signin.tsx            # Authentication
│   └── ...
├── components/               # Reusable components
├── contexts/                 # React contexts (Auth, Notifications, etc.)
├── hooks/                    # Custom hooks
├── services/                 # API services (Supabase, matching, etc.)
├── lib/                      # Utility libraries (Supabase client, etc.)
├── assets/                   # Images and media
└── package.json
```

## Available Scripts

- `npm start`: Start the Expo development server
- `npm run android`: Run the app on an Android device/emulator
- `npm run ios`: Run the app on an iOS simulator
- `npm run web`: Run the app in a web browser
- `npm run lint`: Run ESLint
- `npm run reset-project`: Reset to blank project

## Key Features Breakdown

### Authentication
- Email/password signup and login
- Google sign-in integration
- Supabase Auth handles secure user sessions

### Donor Eligibility
- Tracks last donation date
- Calculates next eligible donation date (90-day cooldown)
- Checks minimum weight and age requirements

### Geospatial Matching
- Uses PostGIS for efficient location-based queries
- Converts between WKB, GeoJSON, and latitude/longitude
- Haversine distance calculations on client

### Messaging
- Realtime chat via Supabase Realtime
- Messages tied to donation appointments
- Read status tracking
- In-app notifications for new messages

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the iDonate blood donation platform.

