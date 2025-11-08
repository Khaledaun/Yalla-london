'use client'

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Clock, Navigation } from 'lucide-react';

export interface MapModulePreviewProps {
  module: {
    content: {
      title: string;
      location: { lat: number; lng: number };
      zoom: number;
      showMarker: boolean;
    };
  };
}

export function MapModulePreview({ module }: MapModulePreviewProps) {
  const { content } = module;

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {content.title || 'Find Us'}
          </h2>
          <p className="text-lg text-gray-600">
            Visit us at our central London location
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map */}
          <div className="bg-gray-200 rounded-lg h-96 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100"></div>
            <div className="relative z-10 text-center">
              <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Interactive Map</p>
              <p className="text-sm text-gray-500">
                Lat: {content.location.lat}, Lng: {content.location.lng}
              </p>
              <p className="text-sm text-gray-500">
                Zoom: {content.zoom}x
              </p>
            </div>
            {content.showMarker && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Location Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Visit Our Location</h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">
                      123 Oxford Street<br />
                      London W1D 2HX<br />
                      United Kingdom
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">+44 20 7123 4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Opening Hours</p>
                    <div className="text-gray-600 text-sm space-y-1">
                      <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                      <p>Saturday: 10:00 AM - 5:00 PM</p>
                      <p>Sunday: 11:00 AM - 4:00 PM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button className="flex-1">
                  <Navigation className="h-4 w-4 mr-2" />
                  Get Directions
                </Button>
                <Button variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Us
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}