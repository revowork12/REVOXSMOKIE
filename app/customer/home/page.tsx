'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function CustomerHome() {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-primary">
      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Main Logo/Brand */}
          <div className="mb-12">
            <h1 className="text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-4 text-secondary drop-shadow-lg">
              SMOKIES
            </h1>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-[0.3em] mb-6 text-accent uppercase">
              HAMBURGERS
            </h2>
            <div className="w-24 h-1 mx-auto rounded-full bg-secondary shadow-md"></div>
          </div>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl lg:text-2xl font-medium text-secondary/80 mb-8 max-w-2xl mx-auto tracking-wide">
            Gourmet American Hamburgers
          </p>
        </div>

        {/* Featured Image */}
        <div className="mb-12">
          <div className="max-w-3xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
              <div style={{ height: '450px' }}>
                <Image
                  src="/photo_5890062852490464111_y1.jpg"
                  alt="Gourmet Smokies Hamburger"
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: '50% 35%' }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 60vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <Link
            href="/customer/menu"
            className="inline-block px-12 py-4 rounded-xl font-bold text-xl uppercase tracking-widest transition-all duration-300 hover:scale-105 hover:shadow-2xl transform bg-accent text-white hover:bg-accent/90 shadow-lg"
          >
            Order Now
          </Link>
        </div>
      </div>
    </div>
  )
}