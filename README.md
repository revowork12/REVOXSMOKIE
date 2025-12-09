# REVOXSMOKIES - Smokies Hamburger

A modern, responsive hamburger ordering application built with Next.js 14 App Router and TailwindCSS.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## 📁 Project Structure

```
revoxegg/
├── app/
│   ├── globals.css           # Global styles with Tailwind
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home redirect page
│   └── customer/
│       ├── home/
│       │   └── page.tsx     # Customer home page (/customer/home)
│       └── menu/
│           └── page.tsx     # Menu page (/customer/menu)
├── package.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

## 🎨 Design System

- **Theme Colors:**
  - Background: Cream (`#F5F2E8`)
  - Primary: Navy (`#001F3F`)
- **Typography:** Montserrat font family
- **Responsive:** Mobile-first design (1 col → 2 cols → 3 cols)

## 🌟 Features

- **Route: `/customer/home`**
  - Clean, centered title "SMOKIES HAMBURGERS" in Montserrat
  - Subtitle "Order smart. Eat smart."
  - Responsive food gallery with 5 high-quality Unsplash images
  - CTA button with hover effects (scale + shadow)
  - Navigation to `/customer/menu`

- **Route: `/customer/menu`**
  - Placeholder menu page
  - Back navigation to home

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Manual Build
```bash
npm run build
npm start
```

## 🔧 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **Language:** TypeScript
- **Images:** Next.js Image component with Unsplash
- **Font:** Google Fonts (Montserrat)

## 📱 Responsive Design

- **Mobile:** Single column grid
- **Tablet:** Two column grid  
- **Desktop:** Three column grid
- **All breakpoints:** Optimized typography and spacing

## 🌐 Integration Ready

- **Supabase:** Ready for auth and database integration
- **GitHub:** Version control friendly
- **Vercel:** One-click deployment
- **No vendor lock-in:** Pure Next.js, easily exportable