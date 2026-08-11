import React, { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useLocation, useNavigate } from "react-router-dom"
import { useGoogleLogin } from "@react-oauth/google"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, MapPin, Phone, Mail, User, Shield, CheckCircle2, Star,
  ChevronRight, ChevronLeft, ArrowLeft, Clock, Calendar, Camera,
  Upload, AlertCircle, Check, X, Info, Zap, Lock, Settings,
  Droplets, Wind, Bug, Brush, Cpu, Hammer, Package, Sparkles,
  Home, RefreshCw, MessageSquare, KeyRound, ShieldCheck, Compass,
  LogIn, ChevronDown, ChevronUp, Plus, Award, Users, ThumbsUp, ArrowRight,
  FileText, CheckCheck, Phone as PhoneIcon, ShoppingCart,
  CreditCard, Wallet, Tag as TagIcon, Bell, LifeBuoy, LogOut, Ticket,
  Calculator, PaintRoller, Smartphone, MoreVertical, Truck
} from "lucide-react"
import {
  apiRequestCustomerEmailOTP, apiVerifyCustomerEmailOTP,
  apiRequestCustomerPhoneOTP, apiVerifyCustomerPhoneOTP,
  apiFetchCustomerBookings, apiLogout, apiCustomerGoogleLogin, extractAuthError,
  apiUpdateCustomerLastLocation, apiDetectCustomerLocation
} from "../../api/authService.js"
import { useAuth } from "../../state/auth/useAuth.js"
import { routes } from "../routes.js"
import { apiRequest } from "../../api/client.js"
import { CalTrackLogo } from "../components/CalTrackLogo.jsx"
import { CustomerEntryFlowModal } from "../components/CustomerEntryFlowModal.jsx"
import { LocationPermissionHandler } from "../components/AddressPicker/index.js"
import { SofaCleaningModal } from "./SofaCleaningModal.jsx"
import { BathroomCleaningModal } from "./BathroomCleaningModal.jsx"
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { getAddress } from "../../api/geocoding.js";

let BOOKING_CURRENCY_SYMBOL = "₹";

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   DATA
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */


function FacebookMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  )
}
function InstagramMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function YoutubeMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.5 6.5s-.22-1.56-.9-2.25c-.86-.9-1.82-.9-2.26-.96C16.2 3 12 3 12 3h-.01s-4.2 0-7.34.29c-.44.06-1.4.06-2.26.96C1.72 4.94 1.5 6.5 1.5 6.5S1.2 8.35 1.2 10.2v1.6c0 1.85.3 3.7.3 3.7s.22 1.56.89 2.25c.86.9 1.98.87 2.48.97C6.6 18.9 12 19 12 19s4.2-.01 7.34-.3c.44-.05 1.4-.05 2.26-.96.68-.69.9-2.25.9-2.25s.3-1.85.3-3.7v-1.6c0-1.85-.3-3.7-.3-3.7ZM9.75 13.9V8.5l5.25 2.71-5.25 2.7Z" />
    </svg>
  )
}
function TwitterMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 3H22l-7.2 8.23L23 21h-6.6l-5.17-6.42L5.3 21H2.2l7.7-8.8L2 3h6.75l4.67 5.86L18.9 3Zm-1.16 16.2h1.72L7.35 4.7H5.5l12.24 14.5Z" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────────────────────────────────── */


export const CATEGORIES = [
  { id: "cleaning", name: "Home Cleaning", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop", desc: "Deep clean & sanitization", rating: "4.8", jobs: "50K+" },
  { id: "sofa_cleaning", name: "Sofa Cleaning", image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=500&q=80&fit=crop", desc: "Sofa, mattress & carpet", rating: "4.8", jobs: "15K+" },
  { id: "kitchen_cleaning", name: "Kitchen Cleaning", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80&fit=crop", desc: "Complete kitchen & appliance clean", rating: "4.8", jobs: "20K+" },
  { id: "bathroom_cleaning", name: "Bathroom Cleaning", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80&fit=crop", desc: "Bathroom deep cleaning & subscriptions", rating: "4.8", jobs: "25K+" },
  { id: "plumbing", name: "Plumbing", image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&q=80&fit=crop", desc: "Leaks, pipes & fixtures", rating: "4.7", jobs: "30K+" },
  { id: "electrical", name: "Electrical", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80&fit=crop", desc: "Wiring, panels & lighting", rating: "4.8", jobs: "40K+" },
  { id: "carpentry", name: "Carpentry", image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80&fit=crop", desc: "Furniture & wood repairs", rating: "4.6", jobs: "15K+" },
  { id: "hvac", name: "AC & Heating", image: "/mockups/service_hvac.png", desc: "AC service & installation", rating: "4.9", jobs: "60K+" },
  { id: "pest_control", name: "Pest Control", image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=500&q=80&fit=crop", desc: "Termites, cockroaches & more", rating: "4.7", jobs: "25K+" },
  { id: "painting", name: "Painting", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80&fit=crop", desc: "Walls, ceilings & textures", rating: "4.6", jobs: "20K+" },
  { id: "mason", name: "Mason", image: "/mockups/service_building.png", desc: "Brick, plaster & civil work", rating: "4.8", jobs: "12K+" },
  { id: "appliance_repair", name: "Appliances", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&q=80&fit=crop", desc: "Fridge, washer & oven repairs", rating: "4.8", jobs: "35K+" },
  { id: "security", name: "Security Systems", image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500&q=80&fit=crop", desc: "CCTV & alarm systems", rating: "4.7", jobs: "10K+" },
  { id: "general", name: "General Repair", image: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&q=80&fit=crop", desc: "Handyman & misc tasks", rating: "4.5", jobs: "45K+" },
]

function openGoogleSignInPopup(onSuccess, onError) {
  const runSignIn = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      if (typeof onError === 'function') onError("Google login service is not available. Please refresh the page.");
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: "628867483502-e7snj6l150js2vpvkv70opo5h4aacgus.apps.googleusercontent.com",
        scope: "email profile openid",
        callback: (response) => {
          try {
            if (response && response.access_token) {
              if (typeof onSuccess === 'function') {
                Promise.resolve(onSuccess(response.access_token)).catch(err => {
                  if (typeof onError === 'function') onError(err?.message || "Google login failed.");
                });
              }
            } else if (response && response.error) {
              if (typeof onError === 'function') onError(response.error_description || "Google login cancelled or failed.");
            } else {
              if (typeof onError === 'function') onError("Google login cancelled.");
            }
          } catch (e) {
            if (typeof onError === 'function') onError("Failed to process Google sign-in token.");
          }
        },
        error_callback: (err) => {
          if (typeof onError === 'function') onError(err?.message || "Google login error");
        }
      });
      if (client && typeof client.requestAccessToken === 'function') {
        try {
          client.requestAccessToken();
        } catch (reqErr) {
          if (typeof onError === 'function') onError("Browser blocked the Google login popup.");
        }
      }
    } catch (err) {
      if (typeof onError === 'function') onError(err?.message || "Failed to initialize Google login");
    }
  };

  if (!window.google?.accounts?.oauth2) {
    let script = document.getElementById("google-gsi-client");
    if (!script) {
      script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.onload = () => runSignIn();
    script.onerror = () => {
      if (typeof onError === 'function') onError("Failed to load Google Sign-In SDK.");
    };
    if (window.google?.accounts?.oauth2) {
      runSignIn();
    }
  } else {
    runSignIn();
  }
}

const PACKAGES = {
  cleaning: [
    { id: "clean-std", name: "Standard", price: 999, priceStr: "₹999", duration: "2 hrs", popular: false, tag: "", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop", includes: ["Floor Cleaning", "Kitchen Surface Cleaning", "Bathroom Cleaning", "Dusting"], excludes: [] },
    { id: "clean-prem", name: "Premium", price: 2499, priceStr: "₹2,499", duration: "4 hrs", popular: true, tag: "Most Booked", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop", includes: ["Complete Home Deep Cleaning", "Kitchen Deep Cleaning", "Bathroom Deep Cleaning", "Sofa Vacuuming", "Window Cleaning", "Balcony Cleaning"], excludes: [] },
    { id: "clean-move", name: "Move-In / Move-Out Package", price: 3499, priceStr: "₹3,499", duration: "6 hrs", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop", includes: ["Entire House Cleaning", "Cabinet Cleaning", "Fan & Light Cleaning", "Window & Glass Cleaning"], excludes: [] },
  ],
  plumbing: [
    { id: "plum-std", name: "Standard", price: 299, priceStr: "₹299", duration: "1 hr", popular: false, tag: "", includes: ["One Plumbing Issue", "Leak Check", "Basic Repair"], excludes: [] },
    { id: "plum-prem", name: "Premium", price: 799, priceStr: "₹799", duration: "2 hrs", popular: true, tag: "Most Booked", image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&q=80&fit=crop", includes: ["Up to 3 Plumbing Repairs", "Pipe Inspection", "Drain Cleaning"], excludes: [] },
    { id: "plum-comp", name: "Complete Home Plumbing", price: 1999, priceStr: "₹1,999", duration: "3 hrs", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1607472586893-edb57cb3b4e1?w=300&q=80&fit=crop", includes: ["Full House Plumbing Inspection", "Multiple Repairs", "Water Pressure Check"], excludes: [] },
  ],
  electrical: [
    { id: "elec-std", name: "Standard", price: 299, priceStr: "₹299", duration: "1 hr", popular: false, tag: "", includes: ["One Electrical Repair", "Safety Check"], excludes: [] },
    { id: "elec-prem", name: "Premium", price: 899, priceStr: "₹899", duration: "2 hrs", popular: true, tag: "Most Booked", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop", includes: ["Multiple Electrical Repairs", "Wiring Inspection", "MCB Check"], excludes: [] },
    { id: "elec-care", name: "Home Electrical Care", price: 1999, priceStr: "₹1,999", duration: "3 hrs", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop", includes: ["Complete Home Inspection", "Fan & Light Service", "Socket Testing"], excludes: [] },
  ],
  hvac: [
    { id: "hvac-std", name: "Standard Package", price: 599, priceStr: "₹599", duration: "1-2 Hrs", popular: true, tag: "Most Booked", image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=300&q=80&fit=crop", includes: ["General AC Service", "Filter Cleaning", "Cooling Performance Check", "Basic Inspection"], excludes: [] },
    { id: "hvac-prem", name: "Premium Package", price: 1299, priceStr: "₹1,299", duration: "2-3 Hrs", popular: false, tag: "", image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&q=80&fit=crop", includes: ["Deep Coil Cleaning", "Water Jet Cleaning", "Filter Cleaning", "Cooling Performance Check", "Gas Pressure Check", "Minor Adjustments", "30-Day Service Warranty"], excludes: [] },
    { id: "hvac-amc", name: "Annual Maintenance Package (AMC)", price: 2999, priceStr: "₹2,999", duration: "Yearly", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1610486842247-7505ed272fc4?w=300&q=80&fit=crop", includes: ["4 AC Services per Year", "Priority Technician", "Discount on Spare Parts", "Free Basic Inspection", "Service Reminder"], excludes: [] },
  ],
  appliance_repair: [
    { id: "app-std", name: "Standard", price: 399, priceStr: "₹399", duration: "1 hr", popular: false, tag: "", includes: ["Appliance Diagnosis", "Basic Repair"], excludes: [] },
    { id: "app-prem", name: "Premium", price: 999, priceStr: "₹999", duration: "2 hrs", popular: true, tag: "Most Booked", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop", includes: ["Complete Servicing", "Internal Cleaning", "Performance Testing"], excludes: [] },
    { id: "app-amc", name: "Annual Care Plan", price: 2499, priceStr: "₹2,499", duration: "Yearly", popular: false, tag: "Best Value", includes: ["3 Service Visits", "Priority Support", "Discount on Parts"], excludes: [] },
  ],
  security: [
    { id: "check", name: "System Check", price: 499, priceStr: "₹499", duration: "1 hr", popular: false, tag: "", includes: ["Camera test", "DVR check", "App verify"], excludes: ["New cables", "Repositioning"] },
    { id: "install2", name: "2-Camera Setup", price: 2999, priceStr: "₹2,999", duration: "3 hrs", popular: true, tag: "Most Booked", includes: ["2 HD cameras", "DVR setup", "Mobile app config", "Cabling"], excludes: ["Monthly plan"] },
    { id: "install4", name: "4-Camera Setup", price: 4999, priceStr: "₹4,999", duration: "5 hrs", popular: false, tag: "Best Value", includes: ["4 HD cameras", "DVR", "App", "Night vision", "1-yr warranty"], excludes: [] },
  ],
  general: [
    { id: "basic", name: "1 Hr Handyman", price: 299, priceStr: "₹299", duration: "1 hr", popular: false, tag: "", includes: ["Any general task", "Basic tools"], excludes: ["Materials", "Electrical/plumbing"] },
    { id: "standard", name: "2 Hr Handyman", price: 499, priceStr: "₹499", duration: "2 hrs", popular: true, tag: "Most Booked", includes: ["Multiple small tasks", "Tools included", "Experienced pro"], excludes: ["Materials"] },
    { id: "complete", name: "Full Day Pro", price: 999, priceStr: "₹999", duration: "8 hrs", popular: false, tag: "Best Value", includes: ["Unlimited tasks", "All tools", "Priority scheduling"], excludes: ["Materials above •‚¹500"] },
  ],
  carpentry: [
    { id: "carp-std", name: "Standard Repair", price: 499, priceStr: "₹499", duration: "2 hrs", popular: false, tag: "", image: "/tractor-emulsion.png", includes: ["Minor Woodwork", "Hinge Replacement", "Basic Fixes"], excludes: [] },
    { id: "carp-prem", name: "Premium Setup", price: 999, priceStr: "₹999", duration: "4 hrs", popular: true, tag: "Most Booked", image: "/tractor-emulsion.png", includes: ["Furniture Assembly", "Custom Shelving", "Door Alignment"], excludes: [] },
    { id: "carp-full", name: "Full Day Carpentry", price: 1999, priceStr: "₹1,999", duration: "8 hrs", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=300&q=80&fit=crop", includes: ["Extensive Repairs", "New Installations", "Material Shopping"], excludes: [] },
  ],
  pest_control: [
    { id: "pest-std", name: "Basic Pest Control", price: 799, priceStr: "₹799", duration: "1 hr", popular: false, tag: "", image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=300&q=80&fit=crop", includes: ["Cockroach & Ant Spray", "Targeted Areas"], excludes: [] },
    { id: "pest-prem", name: "Comprehensive Treatment", price: 1499, priceStr: "₹1,499", duration: "2 hrs", popular: true, tag: "Most Booked", image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=300&q=80&fit=crop", includes: ["Full Home Spray", "Termite Check", "Bedbug Treatment"], excludes: [] },
    { id: "pest-year", name: "Annual Pest Protection", price: 3499, priceStr: "₹3,499", duration: "Yearly", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1628102491629-778586284000?w=300&q=80&fit=crop", includes: ["3 Service Visits", "Priority Response", "Guarantee"], excludes: [] },
  ],
  painting: [
    { id: "paint-room", name: "Single Room Makeover", price: 2999, priceStr: "₹2,999", duration: "1 day", popular: false, tag: "", image: "/tractor-uno.png", includes: ["Basic Prep", "2 Coats Paint", "Cleanup"], excludes: [] },
    { id: "paint-home", name: "Complete Home Painting", price: 9999, priceStr: "₹9,999", duration: "4 days", popular: true, tag: "Most Booked", image: "/tractor-uno.png", includes: ["Wall Putty", "Primer", "Premium Paint", "Post-Cleanup"], excludes: [] },
    { id: "paint-prem", name: "Texture & Decor Painting", price: 14999, priceStr: "₹14,999", duration: "5 days", popular: false, tag: "Best Value", image: "https://images.unsplash.com/photo-1584820927500-11b3337a7c5a?w=300&q=80&fit=crop", includes: ["Custom Textures", "Accent Walls", "Designer Finish"], excludes: [] },
  ],
}

const TIME_SLOTS = [
  { period: "Morning", icon: "ðŸŒ…", slots: [{ t: "07:00", l: "7:00 AM" }, { t: "08:00", l: "8:00 AM" }, { t: "09:00", l: "9:00 AM" }, { t: "10:00", l: "10:00 AM" }, { t: "11:00", l: "11:00 AM" }] },
  { period: "Afternoon", icon: "•˜•ï¸", slots: [{ t: "12:00", l: "12:00 PM" }, { t: "13:00", l: "1:00 PM" }, { t: "14:00", l: "2:00 PM" }, { t: "15:00", l: "3:00 PM" }, { t: "16:00", l: "4:00 PM" }] },
  { period: "Evening", icon: "ðŸŒ†", slots: [{ t: "17:00", l: "5:00 PM" }, { t: "18:00", l: "6:00 PM" }, { t: "19:00", l: "7:00 PM" }] },
]

const REVIEWS = [
  { name: "Priya S.", rating: 5, text: "Amazing service! The technician was on time and very professional. Will definitely book again.", cat: "cleaning", ago: "2 days ago", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop" },
  { name: "Rahul M.", rating: 5, text: "Fixed my AC perfectly. Explained everything clearly and the price was very reasonable.", cat: "hvac", ago: "5 days ago", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop" },
  { name: "Anita K.", rating: 5, text: "Super clean work. Our bathroom looks brand new after the deep clean.", cat: "cleaning", ago: "1 week ago", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop" },
  { name: "Sanjay P.", rating: 5, text: "Wiring issue sorted in under an hour. Very knowledgeable electrician.", cat: "electrical", ago: "3 days ago", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" },
]

function getRelativeTime(isoString) {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function generateAvatarUrl(name) {
  const n = name || "C";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=random&color=fff&size=150`;
}

const OTP_SESSION_KEY = "bk_cust_verified"

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   HELPERS
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function getNextDays(n = 21) {
  const out = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const dayStr = String(d.getDate()).padStart(2, '0')
    out.push({
      iso: `${year}-${month}-${dayStr}`,
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      date: d.getDate(),
      month: d.toLocaleDateString("en-IN", { month: "short" }),
      today: i === 0,
    })
  }
  return out
}

const DAYS_LIST = getNextDays(21)

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   MINI COMPONENTS
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function Tag({ children, color = "#7C3AED" }) {
  return (
    <span style={{
      background: color + "18", color,
      borderRadius: 99, padding: "2px 9px",
      fontSize: "0.62rem", fontWeight: 800,
      letterSpacing: "0.04em", textTransform: "uppercase",
      border: `1px solid ${color}30`,
    }}>{children}</span>
  )
}

function StarRow({ rating = 4.8, count, size = 12 }) {
  const full = Math.floor(rating)
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} style={{ fill: i <= full ? "#F59E0B" : "none", color: i <= full ? "#F59E0B" : "#e2e8f0" }} />
      ))}
      <span style={{ fontSize: size * 0.9, fontWeight: 700, color: "#1e293b", marginLeft: 3 }}>{rating}</span>
      {count && <span style={{ fontSize: size * 0.8, color: "#94a3b8" }}>({count})</span>}
    </span>
  )
}

function ProgressBar({ step, total }) {
  return (
    <div style={{ height: 3, background: "#e2e8f0", borderRadius: 2, overflow: "hidden" }}>
      <motion.div
        style={{ height: "100%", background: "linear-gradient(90deg,#7C3AED,#a855f7)", borderRadius: 2 }}
        initial={{ width: 0 }}
        animate={{ width: `${(step / total) * 100}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  )
}

function SummaryBar({ category, cart, date, time, step }) {
  if (step < 3 || !category) return null
  const totalItems = cart ? cart.reduce((a, c) => a + c.quantity, 0) : 0;
  const totalPrice = cart ? cart.reduce((a, c) => a + (c.price * c.quantity), 0) : 0;

  return (
    <div style={{
      background: "white", borderBottom: "1px solid #e2e8f0",
      padding: "0.6rem 1.5rem",
      display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
      fontSize: "0.72rem", fontWeight: 700, color: "#475569",
    }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: "1rem" }}>{category.emoji}</span> {category.name}
      </span>
      {cart && cart.length > 0 && <>
        <ChevronRight size={12} style={{ color: "#cbd5e1" }} />
        <span style={{ color: "#7C3AED" }}>{totalItems} item{totalItems > 1 ? 's' : ''} Â· {BOOKING_CURRENCY_SYMBOL}{totalPrice}</span>
      </>}
      {date && <>
        <ChevronRight size={12} style={{ color: "#cbd5e1" }} />
        <span><Calendar size={11} style={{ verticalAlign: "middle" }} /> {date}</span>
      </>}
      {time && <>
        <Clock size={11} style={{ verticalAlign: "middle" }} /> {time}
      </>}
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP 1 •” HOME (Hero + Services)
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */
/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   /* ─────────────────────────────────────────────────────────────
   SAVED ADDRESSES MODAL (Urban-style Address Selector)
   ───────────────────────────────────────────────────────────── */

function SavedAddressesModal({
  onClose,
  onSelectAddress,
  currentAddress,
  onAddNewAddress
}) {
  const [addresses, setAddresses] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    async function loadSavedAddresses() {
      try {
        const res = await apiRequest("/customer/addresses/")
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data.map(a => ({
            id: String(a.id),
            title: a.label || a.address_type || "Saved Address",
            text: a.formatted_address || [a.locality, a.city, a.state].filter(Boolean).join(", ")
          }))
          setAddresses(list)
          const found = list.find(a => a.text === currentAddress)
          setSelectedId(found ? found.id : list[0].id)
        } else {
          setAddresses([])
        }
      } catch (err) {
        console.warn("Failed to fetch saved addresses:", err)
        setAddresses([])
      }
    }
    loadSavedAddresses()
  }, [currentAddress])

  const [menuOpenId, setMenuOpenId] = useState(null)

  const handleProceed = () => {
    const sel = addresses.find(a => a.id === selectedId)
    if (sel) {
      onSelectAddress(sel.text)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose}>
      <motion.div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col font-sans text-slate-800"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white hover:bg-slate-100 text-slate-800 flex items-center justify-center shadow-lg border border-slate-200 transition-transform active:scale-95 cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h3 className="text-xl font-black text-slate-900 mb-4">
          Saved addresses
        </h3>

        {/* Add another address button */}
        <button
          onClick={() => {
            onAddNewAddress()
          }}
          className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm hover:underline mb-4 py-1 text-left cursor-pointer"
        >
          <Plus size={18} className="stroke-[3]" /> Add another address
        </button>

        <div className="h-px bg-slate-100 -mx-6 mb-4" />

        {/* Address List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 divide-y divide-slate-100">
          {addresses.map((item) => {
            const isSelected = selectedId === item.id
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`pt-3 first:pt-0 flex items-start gap-3 cursor-pointer group`}
              >
                {/* Custom Radio Circle */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${isSelected ? "border-slate-900 bg-white" : "border-slate-300 group-hover:border-slate-400"
                  }`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
                </div>

                {/* Address Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900 block">
                      {item.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === item.id ? null : item.id)
                      }}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-0.5 pr-2">
                    {item.text}
                  </p>

                  {/* 3-dots popup options */}
                  {menuOpenId === item.id && (
                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-2 flex gap-3 text-xs font-bold">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddNewAddress()
                        }}
                        className="text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddresses(prev => prev.filter(a => a.id !== item.id))
                          setMenuOpenId(null)
                        }}
                        className="text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Sticky Proceed Button */}
        <div className="pt-5 border-t border-slate-100 mt-4">
          <button
            onClick={handleProceed}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.99] cursor-pointer"
          >
            Proceed
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ADD ADDRESS SEARCH MODAL (Urban-style "Add another address" flow)
   ───────────────────────────────────────────────────────────── */

export function AddAddressSearchModal({
  onClose,
  onSelectLocation,
  onUseCurrentLocation,
  savedAddresses: initialSaved = []
}) {
  const [query, setQuery] = useState("")
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isGeoLoading, setIsGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState("")
  const [savedAddrs, setSavedAddrs] = useState(initialSaved)

  // Auto fetch saved addresses on mount if logged in
  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await apiRequest('/auth/customer/addresses/')
        if (res && res.success && Array.isArray(res.data)) {
          setSavedAddrs(res.data)
        }
      } catch (e) {
        // guest or non-auth
      }
    }
    loadSaved()
  }, [])

  // Helper: save a location selection to recents in localStorage
  const saveToRecents = (title, details) => {
    try {
      const existing = JSON.parse(localStorage.getItem("calservices_recent_locations") || "[]")
      const newEntry = { title, details }
      // Remove duplicates, add to front, keep max 10
      const filtered = existing.filter(e => e.details !== details)
      const updated = [newEntry, ...filtered].slice(0, 10)
      localStorage.setItem("calservices_recent_locations", JSON.stringify(updated))
      setRecents(updated)
    } catch (e) {}
  }

  // Debounced geocoding search via Google Places Autocomplete
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  useEffect(() => {
    if (!query || query.length < 3) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const delayDebounce = setTimeout(async () => {
      try {
        if (googleApiKey) {
          // Use Google Places Autocomplete API
          const gRes = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleApiKey}`
          )
          const gData = await gRes.json()
          if (gData.status === "OK" && gData.results) {
            const formatted = gData.results.slice(0, 5).map(result => {
              const comps = result.address_components || []
              let name = ""
              for (const c of comps) {
                if (c.types.includes("sublocality_level_1") || c.types.includes("sublocality") || c.types.includes("locality")) {
                  name = c.long_name
                  break
                }
              }
              return {
                title: name || result.formatted_address.split(",")[0],
                details: result.formatted_address,
                lat: result.geometry?.location?.lat,
                lon: result.geometry?.location?.lng
              }
            })
            setSearchResults(formatted)
          } else {
            setSearchResults([])
          }
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error(err)
      }
      setIsSearching(false)
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [query])

  const handleUseCurrentLocationClick = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.")
      return
    }
    setIsGeoLoading(true)
    setGeoError("")

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        const acc = pos.coords.accuracy

        try {
          let readableLocation = ""
          try {
            const backendDetect = await apiDetectCustomerLocation(lat, lng, acc)
            if (backendDetect && backendDetect.success && backendDetect.data) {
              const d = backendDetect.data
              readableLocation = [d.area, d.city, d.state].filter(Boolean).join(", ")
            }
          } catch (e) { }

          if (!readableLocation) {
            try {
              readableLocation = await getAddress(lat, lng)
            } catch (e) { }
          }

          if (!readableLocation) readableLocation = `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`

          onSelectLocation(readableLocation)
          onClose()
        } catch (e) {
          setGeoError("Unable to detect location. Please try again.")
        } finally {
          setIsGeoLoading(false)
        }
      },
      (err) => {
        setIsGeoLoading(false)
        if (err.code === 1) {
          setGeoError("Location permission denied. Please allow location access.")
        } else if (err.code === 2) {
          setGeoError("Unable to detect high-accuracy GPS position.")
        } else if (err.code === 3) {
          setGeoError("Location request timed out.")
        } else {
          setGeoError("Failed to detect location.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // Load recent searches from localStorage (no hardcoded locations)
  const [recents, setRecents] = useState(() => {
    try {
      const stored = localStorage.getItem("calservices_recent_locations")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {}
    return []
  })

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose}>
      <motion.div
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 relative max-h-[90vh] flex flex-col font-sans text-slate-800"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header: Arrow + Search Input */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors shrink-0 cursor-pointer"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search for your location/society/apartment"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 transition-all placeholder:text-slate-400"
              autoFocus
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Use current location option */}
        <button
          onClick={() => {
            setShowMapPicker(true)
          }}
          disabled={isGeoLoading}
          className="flex items-center gap-3 text-purple-700 hover:text-purple-800 font-extrabold text-xs py-2.5 px-1 rounded-xl transition-colors cursor-pointer group mb-3 hover:bg-purple-50/50"
        >
          <div className="w-7 h-7 rounded-full bg-purple-100/70 flex items-center justify-center text-purple-700 shrink-0 group-hover:bg-purple-200/70 transition-colors">
            {isGeoLoading ? (
              <RefreshCw size={15} className="animate-spin text-purple-700" />
            ) : (
              <Compass size={15} className="stroke-[2.5]" />
            )}
          </div>
          <div>
            <span className="block text-purple-700 font-extrabold text-xs">
              {isGeoLoading ? "Detecting location..." : "Use current location"}
            </span>
            <span className="block text-[10px] text-purple-600/70 font-medium">Using GPS for exact address</span>
          </div>
        </button>

        {geoError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-[11px] font-bold text-red-600 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        <div className="h-px bg-slate-100 -mx-6 mb-4" />

        {/* Content Body: Search Results OR (Saved + Recents) */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-slate-800">
          {query.length >= 3 ? (
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                Search Results
              </span>
              {isSearching ? (
                <div className="py-6 text-center text-xs font-bold text-indigo-600 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Searching locations...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => { saveToRecents(item.title, item.details); onSelectLocation(item.details) }}
                      className="py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 rounded-xl px-2 transition-colors"
                    >
                      <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-slate-900 block">{item.title}</span>
                        <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{item.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matching locations found.
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Saved Section */}
              {savedAddrs && savedAddrs.length > 0 ? (
                <div>
                  <h4 className="text-sm font-black text-slate-900 mb-3 tracking-tight">Saved</h4>
                  <div className="space-y-3">
                    {savedAddrs.map((addr, idx) => {
                      const displayAddr = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
                      return (
                        <div
                          key={addr.id || idx}
                          onClick={() => onSelectLocation(displayAddr)}
                          className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-2xl transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5 group-hover:border-purple-300 group-hover:bg-purple-50/50 transition-colors">
                            <Home size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 capitalize group-hover:text-purple-700 transition-colors">
                                {addr.label_display || addr.label || "Home"}
                              </span>
                              {addr.is_default && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-md">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5 truncate">
                              {displayAddr}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => { onClose(); onSelectLocation("") }} className="text-xs font-black text-purple-700 hover:underline pt-2.5 block cursor-pointer">
                    View more
                  </button>
                </div>
              ) : null}

              {/* Recents Section — only shown when user has actual recent searches */}
              {recents.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 mb-3 tracking-tight">Recents</h4>
                  <div className="space-y-3">
                    {recents.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => { saveToRecents(item.title, item.details); onSelectLocation(item.details) }}
                        className="flex items-start gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-2xl transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 mt-0.5 group-hover:border-purple-300 group-hover:bg-purple-50/50 transition-colors">
                          <Clock size={15} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block group-hover:text-purple-700 transition-colors">
                            {item.title}
                          </span>
                          <p className="text-[11px] text-slate-500 font-medium leading-snug mt-0.5">
                            {item.details}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="text-xs font-black text-purple-700 hover:underline pt-2.5 block cursor-pointer">
                    View more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-semibold">
          <span>powered by</span>
          <span className="font-bold text-slate-600">Google</span>
        </div>

        {/* Swiggy/Zomato style Map Picker overlay */}
        {showMapPicker && (
          <LocationPermissionHandler
            onClose={() => setShowMapPicker(false)}
            onManualSearch={() => setShowMapPicker(false)}
            onLocationConfirmed={(addressData) => {
              setShowMapPicker(false)
              const locStr = typeof addressData === "string"
                ? addressData
                : addressData?.formatted_address || [addressData?.flat_house_no, addressData?.locality, addressData?.city].filter(Boolean).join(", ")
              if (typeof onSelectLocation === "function") {
                onSelectLocation(locStr || addressData)
              }
              onClose()
            }}
          />
        )}
      </motion.div>
    </div>
  )
}

function LocationPickerModal({ onClose, onConfirm, initialLocation, initialCoords }) {
  const [search, setSearch] = useState(initialLocation || "")
  const [isFetching, setIsFetching] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [inlineError, setInlineError] = useState("")
  const [locationPayload, setLocationPayload] = useState(null)
  const [mapCenter, setMapCenter] = useState(initialCoords ? [initialCoords.lat, initialCoords.lng] : [12.9716, 77.5946])
  const [searchResults, setSearchResults] = useState([])
  const [mapObj, setMapObj] = useState(null)
  const isTyping = useRef(false)
  const debounceTimerRef = useRef(null)

  // Center map on user's current location when modal opens and auto-fill address
  useEffect(() => {
    if (navigator.geolocation) {
      setIsFetching(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setMapCenter([lat, lon]);
          if (mapObj) {
            mapObj.flyTo([lat, lon], 15);
          }

          // Reverse geocode to get live street address immediately
          try {
            const display = await getAddress(lat, lon);
            if (display) {
              isTyping.current = false;
              setSearch(display);
            }
          } catch (err) {
            console.error("Initial reverse geocoding failed", err);
          }
          setIsFetching(false);
        },
        (err) => {
          console.error("Geolocation failed", err);
          if (initialCoords && mapObj) {
            setMapCenter([initialCoords.lat, initialCoords.lng]);
            mapObj.flyTo([initialCoords.lat, initialCoords.lng], 15);
          }
          setIsFetching(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (initialCoords && mapObj) {
      setMapCenter([initialCoords.lat, initialCoords.lng]);
      mapObj.flyTo([initialCoords.lat, initialCoords.lng], 15);
    }
  }, [mapObj])

  // Fetch location suggestions when typing (dynamic search across all locations)
  useEffect(() => {
    if (!search || search.length < 3 || !isTyping.current) {
      if (!search) setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(search)}&limit=5`);
        const data = await res.json();
        if (data && data.features) {
          const formatted = data.features.map(f => {
            const p = f.properties
            const display = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ")
            return {
              display_name: display,
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0]
            }
          })
          setSearchResults(formatted)
        } else {
          setSearchResults([])
        }
      } catch (err) { console.error(err) }
      setIsSearching(false)
    }, 600)
    return () => clearTimeout(delayDebounce)
  }, [search])

  function MapEvents() {
    const map = useMapEvents({
      moveend: (e) => {
        const center = e.target.getCenter()
        setMapCenter([center.lat, center.lng])
        setIsUpdatingAddress(true)
        setInlineError("")

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
        }

        debounceTimerRef.current = setTimeout(async () => {
          try {
            const lat = parseFloat(center.lat.toFixed(6))
            const lng = parseFloat(center.lng.toFixed(6))
            const res = await apiDetectCustomerLocation(lat, lng)

            if (res && res.success && res.data) {
              const d = res.data
              setLocationPayload(d)
              const readableStr = [d.area, d.city, d.state].filter(Boolean).join(", ")
              isTyping.current = false
              setSearch(readableStr || d.formatted_address)
              setSearchResults([])
              setInlineError("")
            } else {
              setInlineError("Unable to update address for this pin location.")
            }
          } catch (err) {
            setInlineError("Unable to update address for this pin location.")
          } finally {
            setIsUpdatingAddress(false)
          }
        }, 500)
      }
    })
    useEffect(() => { if (!mapObj) setMapObj(map) }, [map, mapObj])
    return null
  }

  const handleSelectResult = (result) => {
    isTyping.current = false
    setSearch(result.display_name)
    setSearchResults([])
    const lat = parseFloat(result.lat)
    const lon = parseFloat(result.lon)
    setMapCenter([lat, lon])
    if (mapObj) {
      mapObj.flyTo([lat, lon], 15)
    }
  }

  // ── Phase 2: Address details form ──
  const [phase, setPhase] = useState(1) // 1 = map, 2 = address form
  const [houseNo, setHouseNo] = useState("")
  const [landmarkInput, setLandmarkInput] = useState("")
  const [saveAs, setSaveAs] = useState("Home")
  const [floor, setFloor] = useState("")
  const [hasLift, setHasLift] = useState("Yes")
  const [altPhone, setAltPhone] = useState("")
  const [directions, setDirections] = useState("")

  const confirmedCity = search ? search.split(",")[0].trim() : "Location"

  const handleConfirmLocation = () => {
    if (!search || isFetching) return
    setPhase(2)
  }

  const handleProceed = () => {
    const liftStr = hasLift === "Yes" ? "Lift available" : "No lift";
    const details = [
      houseNo,
      floor ? `Floor ${floor}` : "",
      `(${liftStr})`,
      landmarkInput
    ].filter(Boolean).join(", ");

    let fullAddress = `${details}, ${search}`;
    if (altPhone) fullAddress += ` | Alt Contact: ${altPhone}`;
    if (directions) fullAddress += ` | Directions: ${directions}`;

    onConfirm(fullAddress)
  }

  // Shared styles
  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 10001,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)',
  }

  const modalStyle = {
    width: '100%', maxWidth: 520,
    background: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    margin: '1rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
    fontFamily: 'inherit',
  }

  const headerStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.4rem',
    borderBottom: '1px solid #f1f5f9',
    background: '#ffffff',
  }

  const tealBtnStyle = {
    width: '100%', padding: '0.85rem',
    background: 'linear-gradient(135deg, #0d9488, #059669)',
    color: 'white', border: 'none', borderRadius: 10,
    fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(13,148,136,0.22)',
    transition: 'all 0.2s',
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem 0.9rem',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    fontSize: '0.88rem', color: '#0f172a', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <motion.div
        style={modalStyle}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        {phase === 1 && (
          <>
            {/* Phase 1 Header */}
            <div style={headerStyle}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Choose Service Location</h3>
              <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%' }}>
                <X size={16} />
              </button>
            </div>

            {/* Leaflet Map */}
            <div style={{ width: '100%', height: 240, position: 'relative', background: '#f1f5f9' }}>
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  attribution="&copy; Google Maps"
                />
                <MapEvents />
              </MapContainer>
              {/* Centered teal pin */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1000 }}>
                <div style={{ transform: 'translateY(-18px)', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.22))' }}>
                  <MapPin size={40} fill="#0d9488" color="white" strokeWidth={1.5} />
                </div>
              </div>
              {/* Fetching / Updating pill */}
              {(isFetching || isUpdatingAddress) && (
                <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.96)', border: '1px solid #e2e8f0', borderRadius: 20, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', zIndex: 1001 }}>
                  {isUpdatingAddress ? "Updating location..." : "Locating on map…"}
                </div>
              )}
            </div>

            {/* Search & Confirm */}
            <div style={{ padding: '1.1rem 1.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '0.5rem 0.85rem', marginBottom: '0.65rem', background: '#f8fafc' }}>
                <Search size={15} color="#94a3b8" style={{ flexShrink: 0 }} />
                <input
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.87rem', width: '100%', color: '#0f172a', fontWeight: 500 }}
                  placeholder={isFetching ? "Locating on map..." : "Search for area, street name..."}
                  value={search}
                  onChange={e => { isTyping.current = true; setSearch(e.target.value); }}
                  autoFocus
                />
              </div>

              {(isSearching || searchResults.length > 0) && (
                <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: '0.65rem', border: '1px solid #f1f5f9', borderRadius: 10, background: 'white', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                  {isSearching && (
                    <div style={{ padding: '0.7rem', textAlign: 'center', color: '#0d9488', fontSize: '0.82rem', fontWeight: 600 }}>Searching...</div>
                  )}
                  {searchResults.map((loc, i) => (
                    <div
                      key={i}
                      style={{ padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', borderBottom: i < searchResults.length - 1 ? '1px solid #f8fafc' : 'none', background: search === loc.display_name ? '#f0fdf4' : 'white' }}
                      onClick={() => handleSelectResult(loc)}
                    >
                      <MapPin size={14} color={search === loc.display_name ? '#0d9488' : '#94a3b8'} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.83rem', fontWeight: 700, color: search === loc.display_name ? '#0d9488' : '#1e293b' }}>{loc.display_name.split(',')[0]}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 1 }}>{loc.display_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {inlineError && (
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.5rem' }}>
                  {inlineError}
                </div>
              )}

              {isTyping.current && search.length > 2 && searchResults.length === 0 && !isSearching && !isFetching && (
                <div style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                  No matches found. Try a different spelling.
                </div>
              )}

              <button style={tealBtnStyle} onClick={handleConfirmLocation} disabled={isFetching || !search}>
                Confirm Location
              </button>
            </div>
          </>
        )}

        {phase === 2 && (
          <>
            {/* Phase 2 Header */}
            <div style={headerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Home size={16} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{confirmedCity}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{search}</div>
                </div>
              </div>
              <button
                onClick={() => setPhase(1)}
                style={{ background: 'none', border: 'none', color: '#0d9488', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
              >
                <MapPin size={13} /> Show Map
              </button>
            </div>

            {/* Address Form */}
            <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '62vh', overflowY: 'auto' }}>
              {/* Row 1: House No & Floor */}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    House / Flat / Block No. <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Flat 302, Block A"
                    value={houseNo}
                    onChange={e => setHouseNo(e.target.value)}
                    autoFocus
                    onFocus={e => e.target.style.borderColor = '#0d9488'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                    Floor <span style={{ fontSize: '0.65rem', color: '#64748b' }}>(Opt)</span>
                  </label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. 3rd"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    onFocus={e => e.target.style.borderColor = '#0d9488'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              </div>

              {/* Row 2: Lift Availability */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  Is Lift Available? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  {['Yes', 'No'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setHasLift(opt)}
                      style={{
                        flex: 1, padding: '0.55rem 0',
                        border: hasLift === opt ? '2px solid #0d9488' : '1.5px solid #e2e8f0',
                        borderRadius: 10, background: hasLift === opt ? '#f0fdf4' : 'white',
                        color: hasLift === opt ? '#059669' : '#475569',
                        fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {opt === 'Yes' ? '🛗 Yes, Lift Available' : '🚫 No Lift (Stairs)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Landmark */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  Landmark / Society Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. near Metro Station, Green Park"
                  value={landmarkInput}
                  onChange={e => setLandmarkInput(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Row 4: Alternate Contact (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  Alternate Contact Number <span style={{ fontSize: '0.65rem', color: '#64748b' }}>(Optional)</span>
                </label>
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={altPhone}
                  onChange={e => setAltPhone(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Row 5: Directions (Optional) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 6 }}>
                  Directions / Entry Notes <span style={{ fontSize: '0.65rem', color: '#64748b' }}>(Optional)</span>
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Gate code #1234, ring second bell"
                  value={directions}
                  onChange={e => setDirections(e.target.value)}
                  onFocus={e => e.target.style.borderColor = '#0d9488'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Row 6: Save address as */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: 8 }}>
                  Save address as <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.55rem' }}>
                  {[
                    { label: 'Home', icon: <Home size={14} /> },
                    { label: 'Work', icon: <Package size={14} /> },
                    { label: 'Other', icon: <MapPin size={14} /> },
                  ].map(({ label, icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setSaveAs(label)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                        padding: '0.55rem 0', border: saveAs === label ? '2px solid #0d9488' : '1.5px solid #e2e8f0',
                        borderRadius: 10, background: saveAs === label ? '#f0fdf4' : 'white',
                        color: saveAs === label ? '#059669' : '#475569',
                        fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                style={{ ...tealBtnStyle, marginTop: 4, opacity: (!houseNo.trim() || !landmarkInput.trim()) ? 0.55 : 1 }}
                onClick={handleProceed}
                disabled={!houseNo.trim() || !landmarkInput.trim()}
              >
                Proceed
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

function StepHome({ searchQuery, setSearchQuery, onSelect, categories, dynamicReviews, user }) {
  const [rotIdx, setRotIdx] = useState(0)
  const safeCats = categories && categories.length > 0 ? categories : CATEGORIES;
  const featured = safeCats.slice(0, 6)
  const rotWords = featured.map(c => c.name)

  const displayName = user?.firstName || user?.first_name || user?.full_name || user?.username
  const greeting = displayName || "Guest"

  useEffect(() => {
    const t = setInterval(() => setRotIdx(i => (i + 1) % rotWords.length), 4500)
    return () => clearInterval(t)
  }, [rotWords.length])

  const filtered = searchQuery
    ? safeCats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : safeCats

  return (
    <>
      <div className="uc-home-wrapper">
        <div className="uc-home-left">
          {/* Hero */}
          <div className="uc-hero">
            <div className="uc-hero-inner">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <p className="uc-hero-tag">•­ India's #1 Home Services Platform</p>
                <h1 className="uc-hero-h1">
                  Professional
                  <br />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={rotIdx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.8 }}
                      className="uc-hero-rotate"
                    >
                      {rotWords[rotIdx]}
                    </motion.span>
                  </AnimatePresence>
                  <br />
                  at your doorstep
                </h1>
                <p className="uc-hero-sub">Trained & verified experts Â· Transparent pricing Â· Real-time tracking</p>
              </motion.div>

              {/* Search Bar */}
              <motion.div className="uc-search-bar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Search size={18} className="uc-search-icon" />
                <input
                  className="uc-search-input"
                  placeholder="Search for services (e.g. AC repair, deep cleaning•¦)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="uc-search-clear" onClick={() => setSearchQuery("")}>
                    <X size={14} />
                  </button>
                )}
              </motion.div>

              {/* Trust pills */}
              <motion.div className="uc-trust-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <span><ShieldCheck size={13} /> Verified Pros</span>
                <span><Star size={13} style={{ fill: "#fbbf24", color: "#fbbf24" }} /> 4.8•˜… Rated</span>
                <span><Users size={13} /> 1M+ Happy Homes</span>
                <span><Award size={13} /> 30-Day Guarantee</span>
              </motion.div>
            </div>
          </div>
        </div>
        <div className="uc-home-right">
          <div className="uc-feature-carousel">
            <AnimatePresence mode="wait">
              <motion.div
                key={featured[rotIdx].id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.2 }}
                className="uc-feature-slide"
              >
                <img src={featured[rotIdx].image} alt={featured[rotIdx].name} className="uc-feature-img" />
                <div className="uc-feature-overlay">
                  <div className="uc-feature-text">
                    <h3>{featured[rotIdx].name}</h3>
                    <p>{featured[rotIdx].desc}</p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 600 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={14} style={{ fill: "#fbbf24", color: "#fbbf24" }} /> {featured[rotIdx].rating} Rated</span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> {featured[rotIdx].jobs} Bookings</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="uc-section">
        <div className="uc-section-header">
          <h2 className="uc-section-title">Our Services</h2>
          <p className="uc-section-sub">Pick a category to get started</p>
        </div>

        <div className="uc-cat-grid">
          {filtered.map((cat, i) => (
            <motion.button
              key={cat.id}
              id={`cat-card-${cat.id}`}
              data-cat-id={cat.id}
              className="uc-cat-card"
              onClick={() => onSelect(cat)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="uc-cat-img-wrap">
                <img src={cat.image} alt={cat.name} className="uc-cat-image" />
                <div className="uc-cat-overlay">
                  <span className="uc-cat-btn">Book Now</span>
                </div>
              </div>
              <div className="uc-cat-body">
                <div className="uc-cat-name">{cat.name}</div>
                <div className="uc-cat-desc">{cat.desc}</div>
                <div className="uc-cat-meta">
                  <StarRow rating={cat.rating} size={11} />
                  <span className="uc-cat-jobs">{cat.jobs} bookings</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
            <Search size={32} style={{ margin: "0 auto 0.75rem" }} />
            <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>No services found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      <div>
        {/* How it Works */}
        <div className="uc-how">
          <h2 className="uc-section-title" style={{ textAlign: "center" }}>How it works</h2>
          <p className="uc-section-sub" style={{ textAlign: "center" }}>Book a service in 3 simple steps</p>
          <div className="uc-how-grid">
            {[
              { n: "1", icon: <Search size={28} className="uc-how-svg" strokeWidth={1.5} />, title: "Choose Service", desc: "Pick from 10+ categories and select your preferred package" },
              { n: "2", icon: <Calendar size={28} className="uc-how-svg" strokeWidth={1.5} />, title: "Pick Date & Time", desc: "Choose a convenient slot from our available timings" },
              { n: "3", icon: <Star size={28} className="uc-how-svg" strokeWidth={1.5} />, title: "Expert at Door", desc: "A verified professional arrives and gets the job done" },
            ].map((step, i) => (
              <div key={i} className="uc-how-card">
                <div className="uc-how-number">{step.n}</div>
                <div className="uc-how-icon-wrapper">{step.icon}</div>
                <div className="uc-how-title">{step.title}</div>
                <div className="uc-how-desc">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        {dynamicReviews && dynamicReviews.length > 0 && (
          <div className="uc-reviews-section">
            <h2 className="uc-section-title" style={{ textAlign: "center" }}>What our customers say</h2>
            <div className="uc-reviews-grid">
              {dynamicReviews.map((r, i) => (
                <motion.div key={i} className="uc-review-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="uc-review-top">
                    <img src={r.avatar} alt={r.name} className="uc-review-avatar-img" />
                    <div>
                      <div className="uc-review-name">{r.name}</div>
                      <div className="uc-review-ago">{r.ago}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                      <StarRow rating={r.rating} size={14} />
                    </div>
                  </div>
                  <p className="uc-review-text">"{r.text}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP 2 •” PACKAGE SELECTION
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function StepPackage({ category, selectedPackage, onSelect, onNext, onBack, packagesData }) {
  const packages = ((packagesData && packagesData[category?.id]) || PACKAGES[category?.id] || []).map(p => ({ ...p, priceStr: BOOKING_CURRENCY_SYMBOL + p.price }))

  return (
    <div className="uc-step-page">
      <div className="uc-step-back" onClick={onBack}><ArrowLeft size={16} /> Back</div>

      <div className="uc-step-hero-bar" style={{ background: `linear-gradient(135deg,${category?.grad?.[0]},${category?.grad?.[1]})` }}>
        <span style={{ fontSize: "2.5rem" }}>{category?.emoji}</span>
        <div>
          <div className="uc-step-hero-name">{category?.name}</div>
          <StarRow rating={category?.rating} size={13} />
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{category?.desc}</div>
        </div>
      </div>

      <h2 className="uc-step-h2">Choose your package</h2>
      <p className="uc-step-sub">Transparent pricing Â· No hidden charges</p>

      <div className="uc-pkg-grid">
        {packages.map(pkg => {
          const sel = selectedPackage?.id === pkg.id
          return (
            <motion.div
              key={pkg.id}
              className={`uc-pkg-card ${sel ? "uc-pkg-card--sel" : ""} ${pkg.popular ? "uc-pkg-card--pop" : ""}`}
              onClick={() => onSelect(pkg)}
              whileHover={{ y: -2 }}
              layout
            >
              {pkg.tag && (
                <div className="uc-pkg-tag" style={{ background: pkg.popular ? "#7C3AED" : "#059669" }}>
                  {pkg.popular ? "•­ " : "•œ… "}{pkg.tag}
                </div>
              )}

              {pkg.image && (
                <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', height: 140 }}>
                  <img src={pkg.image} alt={pkg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div className="uc-pkg-top">
                <div>
                  <div className="uc-pkg-name">{pkg.name}</div>
                  <div className="uc-pkg-dur"><Clock size={12} /> {pkg.duration} service</div>
                </div>
                <div className="uc-pkg-price-col">
                  <div className="uc-pkg-price">{pkg.priceStr}</div>
                  <div className="uc-pkg-price-note">all inclusive</div>
                </div>
              </div>

              <div className="uc-pkg-divider" />

              <div className="uc-pkg-list">
                {pkg.includes.map(item => (
                  <div key={item} className="uc-pkg-item uc-pkg-yes">
                    <CheckCircle2 size={13} /> {item}
                  </div>
                ))}
                {pkg.excludes.map(item => (
                  <div key={item} className="uc-pkg-item uc-pkg-no">
                    <X size={12} /> {item}
                  </div>
                ))}
              </div>

              <div className={`uc-pkg-radio ${sel ? "uc-pkg-radio--sel" : ""}`}>
                {sel && <div className="uc-pkg-radio-dot" />}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="uc-step-footer">
        <button className="uc-btn-primary" onClick={onNext} disabled={!selectedPackage}>
          Continue <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP 3 •” SCHEDULE
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function StepSchedule({ category, selectedDate, selectedTime, onDateChange, onTimeChange, onNext, onBack, cart }) {
  const dateScrollRef = useRef()
  const canContinue = selectedDate && selectedTime
  const totalPrice = cart && cart.length > 0 ? cart.reduce((a, c) => a + (c.price * c.quantity), 0) : 0
  const taxFee = totalPrice === 0 ? 49 : 99
  const grandTotal = totalPrice + taxFee

  // Urban time slots: Morning / Afternoon / Evening
  const UC_TIME_SLOTS = [
    { period: 'Morning', icon: '🌅', slots: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00'] },
    { period: 'Afternoon', icon: '☀️', slots: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'] },
    { period: 'Evening', icon: '🌙', slots: ['17:00', '18:00', '19:00', '20:00', '21:00'] },
  ]
  const formatSlot = t => {
    const [h] = t.split(':').map(Number)
    const ampm = h < 12 ? 'AM' : 'PM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:00 ${ampm}`
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 960, margin: '0 auto', padding: '0 0 80px' }}>
      {/* LEFT: Slot Picker */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', color: '#64748b', transition: 'all 0.18s' }}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>

        {/* Service info row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc', borderRadius: 14, padding: '14px 16px', marginBottom: 22, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '1.8rem' }}>{category?.emoji || '🔧'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{category?.name || 'Service'}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
              {cart && cart.length > 0 ? cart.map(c => `${c.quantity}x ${c.name}`).join(' · ') : 'Selected services'}
            </div>
          </div>
          <div style={{ fontWeight: 900, color: '#7C3AED', fontSize: '1.1rem' }}>₹{totalPrice.toLocaleString()}</div>
        </div>

        {/* Date Section */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} color="#7C3AED" /> Select Date
          </div>
          <div ref={dateScrollRef} style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
            {DAYS_LIST.map(d => (
              <button
                key={d.iso}
                onClick={() => onDateChange(d.iso)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minWidth: 62, padding: '10px 8px', borderRadius: 14, border: `2px solid ${selectedDate === d.iso ? '#7C3AED' : '#e2e8f0'}`,
                  background: selectedDate === d.iso ? 'linear-gradient(135deg,#7C3AED,#a855f7)' : 'white',
                  cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0, position: 'relative'
                }}
              >
                {d.today && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#7C3AED', color: 'white', fontSize: '0.52rem', fontWeight: 800, padding: '2px 7px', borderRadius: 99, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>TODAY</div>
                )}
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: selectedDate === d.iso ? 'rgba(255,255,255,0.85)' : '#94a3b8', marginBottom: 4 }}>{d.day}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: selectedDate === d.iso ? 'white' : '#0f172a', lineHeight: 1 }}>{d.date}</div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: selectedDate === d.iso ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 3 }}>{d.month}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Time Section */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={15} color="#7C3AED" /> Select Time Slot
          </div>
          {UC_TIME_SLOTS.map(group => (
            <div key={group.period} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                {group.icon} {group.period}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.slots.map(t => (
                  <button
                    key={`${group.period}-${t}`}
                    onClick={() => onTimeChange(t)}
                    style={{
                      padding: '8px 18px', borderRadius: 99,
                      border: `2px solid ${selectedTime === t ? '#7C3AED' : '#e2e8f0'}`,
                      background: selectedTime === t ? '#7C3AED' : 'white',
                      color: selectedTime === t ? 'white' : '#374151',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.18s'
                    }}
                  >
                    {formatSlot(t)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ position: 'sticky', bottom: 0, background: 'white', padding: '16px 0', borderTop: '1px solid #e2e8f0', marginTop: 8 }}>
          <button
            onClick={onNext}
            disabled={!canContinue}
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: canContinue ? 'linear-gradient(135deg,#7C3AED,#a855f7)' : '#e2e8f0',
              color: canContinue ? 'white' : '#94a3b8',
              fontWeight: 800, fontSize: '1rem', border: 'none', cursor: canContinue ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: canContinue ? '0 4px 20px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.18s'
            }}
          >
            <Calendar size={17} /> Select {selectedDate && selectedTime ? `${selectedDate} at ${formatSlot(selectedTime)}` : 'Date & Time'}
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* RIGHT: Order Summary */}
      <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 24 }}>
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Order Summary</div>
          {cart && cart.map((c, i) => (
            <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>{c.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>Qty: {c.quantity}</div>
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>₹{(c.price * c.quantity).toLocaleString()}</div>
            </div>
          ))}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>
              <span>Item total</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹{totalPrice.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
              <span>Taxes & Fee</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹{taxFee}</span>
            </div>
          </div>
          <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>Total Amount</span>
            <span style={{ fontWeight: 900, color: '#7C3AED', fontSize: '1.05rem' }}>₹{grandTotal.toLocaleString()}</span>
          </div>
          <div style={{ padding: '0 18px 14px', fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={11} /> SSL Secured · Pay at doorstep
          </div>
        </div>
      </div>
    </div>
  )
}


/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP 4 •” PHONE OTP IDENTITY
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function StepLogin({ category, onVerified, onBack }) {
  const { user, refreshMe } = useAuth()
  const [mode, setMode] = useState("phone")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState("")
  const [devCode, setDevCode] = useState("")
  const refs = [useRef(), useRef(), useRef(), useRef()]

  // Restore session
  useEffect(() => {
    if (user) {
      onVerified({
        verified: true,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.username || 'Customer'),
        phone: user.phone || '',
        email: user.email || ''
      })
      return
    }
    try {
      const s = JSON.parse(sessionStorage.getItem(OTP_SESSION_KEY) || "null")
      if (s?.verified && s?.name && s?.phone) onVerified(s)
    } catch { }
  }, [user, onVerified])

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const googleLoginHandler = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tr) => {
      setLoading(true);
      setError("");
      try {
        const res = await apiCustomerGoogleLogin(tr.access_token);
        if (res?.success) {
          await refreshMe();
          const data = {
            verified: true,
            name: res.user?.name || "",
            phone: res.user?.phone || "",
            email: res.user?.email || ""
          };
          sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(data));
          onVerified(data);
        } else {
          setError(res?.detail || "Google login failed");
        }
      } catch (err) {
        setError(extractAuthError(err, "Google login failed"));
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google OAuth error:", err);
      setError(err?.error_description || err?.error || "Google login failed");
    }
  });

  const nameOk = name.trim().length >= 2
  const phoneOk = phone.replace(/[\s\-\(\)\+]/g, "").length >= 7

  const sendOtp = async () => {
    if (!nameOk || !phoneOk) return
    setLoading(true); setError(""); setDevCode("")
    try {
      const res = await apiRequest("/auth/send-otp/", { method: "POST", json: { phone } })
      if (res?.success) {
        setMode("otp"); setCooldown(30)
        if (res.code) {
          const digits = String(res.code).split("")
          setOtp(digits); setDevCode(String(res.code))
          setTimeout(() => refs[3]?.current?.focus(), 100)
        }
      } else setError(res?.detail || res?.message || "Failed to send OTP")
    } catch (e) { setError(e?.body?.detail || "Could not send OTP") }
    finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    const code = otp.join("")
    if (code.length < 4) { setError("Enter all 4 digits"); return }
    setLoading(true); setError("")
    try {
      const res = await apiRequest("/auth/verify-otp/", { method: "POST", json: { phone, code } })
      if (res?.success) {
        await refreshMe()
        const data = { verified: true, name: name.trim(), phone, email: email.trim() }
        sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(data))
        setMode("done")
        setTimeout(() => onVerified(data), 700)
      } else setError(res?.detail || "Invalid code")
    } catch (e) { setError(e?.body?.detail || "Verification failed") }
    finally { setLoading(false) }
  }

  const handleDigit = (i, val) => {
    const d = val.replace(/\D/g, "").slice(-1)
    const next = [...otp]; next[i] = d; setOtp(next)
    if (d && i < 3) refs[i + 1]?.current?.focus()
  }
  const handleKey = (i, e) => { if (e.key === "Backspace" && !otp[i] && i > 0) refs[i - 1]?.current?.focus() }
  const handlePaste = e => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    if (p.length === 4) { setOtp(p.split("")); refs[3]?.current?.focus() }
  }

  return (
    <div className="uc-step-page uc-login-page">
      <div className="uc-step-back" onClick={onBack}><ArrowLeft size={16} /> Back</div>

      {/* PHONE MODE */}
      {mode === "phone" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="uc-login-center">
            <div className="uc-login-shield">
              <ShieldCheck size={32} style={{ color: "#7C3AED" }} />
            </div>
            <h2 className="uc-step-h2">Verify your identity</h2>
            <p className="uc-step-sub">We'll send a 4-digit OTP to confirm your phone number before booking</p>
          </div>

          <div className="uc-login-trust-row">
            <span><Shield size={11} /> SSL Secured</span>
            <span><Lock size={11} /> No password needed</span>
            <span><ShieldCheck size={11} /> 5 min OTP expiry</span>
          </div>

          <div className="uc-form">
            <div className="uc-field">
              <label className="uc-label">Full Name <span style={{ color: "#ef4444" }}>*</span></label>
              <div className="uc-input-wrap">
                <User size={15} className="uc-field-icon" />
                <input className="uc-input" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="uc-field">
              <label className="uc-label">Mobile Number <span style={{ color: "#ef4444" }}>*</span></label>
              <div className="uc-input-wrap">
                <Phone size={15} className="uc-field-icon" />
                <input className="uc-input" placeholder="+91 9876 543 210" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && nameOk && phoneOk && sendOtp()}
                />
              </div>
            </div>
            <div className="uc-field">
              <label className="uc-label">Email <span style={{ color: "#94a3b8", fontWeight: 500 }}>(optional)</span></label>
              <div className="uc-input-wrap">
                <Mail size={15} className="uc-field-icon" />
                <input className="uc-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {error && <div className="uc-error"><AlertCircle size={13} /> {error}</div>}

          <button className="uc-btn-primary uc-btn-full" onClick={sendOtp} disabled={!nameOk || !phoneOk || loading}>
            {loading ? <><RefreshCw size={15} className="spin-icon" /> Sending•¦</> : <><MessageSquare size={15} /> Send OTP</>}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
            <span style={{ padding: '0 10px' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
          </div>

          <button
            type="button"
            onClick={() => googleLoginHandler()}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: 'white',
              color: '#1e293b',
              border: '1px solid #cbd5e1',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: loading ? 0.7 : 1
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.8 2.17c1.64-1.51 2.59-3.74 2.59-6.5z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.8-2.17c-.78.52-1.78.83-2.8.83-2.34 0-4.32-1.58-5.03-3.7L1.47 13.07C2.95 16 6.01 18 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.78c-.18-.52-.28-1.09-.28-1.68s.1-1.16.28-1.68L1.47 5.12C.53 7 0 9.08 0 11.2s.53 4.2 1.47 6.08l2.5-1.9c-.71-2.12-.71-4.4 0-6.5z" />
              <path fill="#EA4335" d="M9 3.58c1.32-.03 2.59.48 3.51 1.4l2.63-2.63C13.48.88 11.3.02 9 0 6.01 0 2.95 2 1.47 4.93l2.5 1.9C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>
        </motion.div>
      )}

      {/* OTP MODE */}
      {mode === "otp" && (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
          <div className="uc-login-center">
            <div className="uc-login-shield" style={{ background: "#ecfdf520" }}>
              <KeyRound size={32} style={{ color: "#10B981" }} />
            </div>
            <h2 className="uc-step-h2">Enter OTP</h2>
            <p className="uc-step-sub">
              4-digit code sent to <strong>{phone}</strong> &nbsp;
              <button className="uc-link" onClick={() => { setMode("phone"); setOtp(["", "", "", ""]); setError("") }}>Change</button>
            </p>
          </div>

          {devCode && (
            <div className="uc-dev-banner">
              <Zap size={13} /> Dev mode •” code: <strong>{devCode}</strong> (auto-filled)
            </div>
          )}

          <div className="uc-otp-row" onPaste={handlePaste}>
            {otp.map((d, i) => (
              <input key={i} ref={refs[i]}
                className={`uc-otp-box ${d ? "uc-otp-filled" : ""}`}
                value={d} maxLength={1} inputMode="numeric"
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
              />
            ))}
          </div>

          {error && <div className="uc-error"><AlertCircle size={13} /> {error}</div>}

          <button className="uc-btn-primary uc-btn-full" onClick={verifyOtp} disabled={otp.join("").length < 4 || loading}>
            {loading ? <><RefreshCw size={15} className="spin-icon" /> Verifying•¦</> : <><ShieldCheck size={15} /> Verify &amp; Continue</>}
          </button>

          <div className="uc-resend">
            {cooldown > 0
              ? <span style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600 }}>Resend in {cooldown}s</span>
              : <button className="uc-link" onClick={sendOtp} disabled={loading}>Resend OTP</button>
            }
          </div>
        </motion.div>
      )}

      {/* SUCCESS */}
      {mode === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="uc-login-success">
          <motion.div className="uc-success-check" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2, duration: 0.4 }}>
            <CheckCircle2 size={48} style={{ color: "#10B981" }} />
          </motion.div>
          <div className="uc-success-title">Identity Verified!</div>
          <div className="uc-success-sub">Welcome, {name} ðŸ‘‹</div>
          <div className="uc-success-sub" style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Loading your booking form•¦</div>
        </motion.div>
      )}
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP 5 •” CUSTOMER DETAILS
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function StepDetails({ category, cart, formData, onChange, photoFile, onPhotoChange, photoPreview, onNext, onBack, globalLocation, onOpenMap }) {
  const fileRef = useRef()
  const { user } = useAuth()
  const phoneClean = (formData.phone || "").replace(/[\s\-\(\)\+]/g, "")

  const phoneValid = phoneClean.length >= 7 && /^\d+$/.test(phoneClean)
  const ok = formData.customer_name && phoneValid && formData.address && formData.issue_title

  useEffect(() => {
    if (globalLocation && !formData.address) {
      onChange({ target: { name: 'address', value: globalLocation } })
    }
  }, [globalLocation, formData.address])

  useEffect(() => {
    if (!formData.issue_title && cart && cart.length > 0) {
      const defaultTitle = cart.map(c => c.name).join(', ') + (category ? ` •” ${category.name}` : '');
      onChange({ target: { name: 'issue_title', value: defaultTitle } })
    }
  }, [cart, category, formData.issue_title])

  useEffect(() => {
    if (user) {
      if (!formData.customer_name && user.firstName) {
        onChange({ target: { name: 'customer_name', value: `${user.firstName} ${user.lastName || ''}`.trim() } })
      }
      if (!formData.phone && user.phone) {
        onChange({ target: { name: 'phone', value: user.phone } })
      }
      if (!formData.email && user.email) {
        onChange({ target: { name: 'email', value: user.email } })
      }
    }
  }, [user, formData.customer_name, formData.phone, formData.email])

  return (
    <div className="uc-step-page">
      <div className="uc-step-back" onClick={onBack}><ArrowLeft size={16} /> Back</div>
      <h2 className="uc-step-h2">Service details</h2>
      <p className="uc-step-sub">Tell us where to send our expert and describe the issue</p>

      <div className="uc-form">
        <div className="uc-field-row">
          <div className="uc-field">
            <label className="uc-label">Full Name <span style={{ color: "#ef4444" }}>*</span></label>
            <div className="uc-input-wrap">
              <User size={15} className="uc-field-icon" />
              <input className="uc-input" name="customer_name" placeholder="Your full name" value={formData.customer_name} onChange={onChange} />
            </div>
          </div>
          <div className="uc-field">
            <label className="uc-label">Mobile Number <span style={{ color: "#ef4444" }}>*</span></label>
            <div className="uc-input-wrap">
              <Phone size={15} className="uc-field-icon" />
              <input className="uc-input" name="phone" placeholder="+91 9876 543 210" value={formData.phone} onChange={onChange} />
            </div>
          </div>
        </div>

        <div className="uc-field">
          <label className="uc-label">Email Address</label>
          <div className="uc-input-wrap">
            <Mail size={15} className="uc-field-icon" />
            <input className="uc-input" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={onChange} />
          </div>
        </div>

        <div className="uc-field">
          <label className="uc-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Full Address <span style={{ color: "#ef4444" }}>*</span></span>
            <span onClick={onOpenMap} style={{ color: '#7C3AED', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> Pick on Map</span>
          </label>
          <div className="uc-input-wrap" onClick={onOpenMap} style={{ cursor: 'pointer' }}>
            <MapPin size={15} className="uc-field-icon" />
            <input className="uc-input" name="address" placeholder="Tap to pick location from map..." value={formData.address} readOnly style={{ cursor: 'pointer' }} />
          </div>
        </div>

        <div className="uc-field">
          <label className="uc-label">House/Flat No, Landmark (optional)</label>
          <div className="uc-input-wrap">
            <Home size={15} className="uc-field-icon" />
            <input className="uc-input" name="landmark" placeholder="e.g. Flat 402, Near Metro Station" value={formData.landmark || ""} onChange={onChange} />
          </div>
        </div>

        <div className="uc-field">
          <label className="uc-label">Issue Title <span style={{ color: "#ef4444" }}>*</span></label>
          <div className="uc-input-wrap">
            <FileText size={15} className="uc-field-icon" />
            <input className="uc-input" name="issue_title" placeholder={`e.g. ${category?.name} - brief description`} value={formData.issue_title} onChange={onChange} />
          </div>
        </div>

        <div className="uc-field">
          <label className="uc-label">Describe the problem (optional)</label>
          <textarea
            className="uc-textarea"
            name="description"
            rows={3}
            placeholder="Any specific issues, brand of appliance, how long the problem has been occurring•¦"
            value={formData.description}
            onChange={onChange}
          />
        </div>

        {/* Photo Upload */}
        <div className="uc-field">
          <label className="uc-label">Attach a photo (optional)</label>
          <div
            className="uc-photo-zone"
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview ? (
              <div className="uc-photo-preview">
                <img src={photoPreview} alt="preview" />
                <div className="uc-photo-change"><Camera size={14} /> Change photo</div>
              </div>
            ) : (
              <>
                <Camera size={24} style={{ color: "#94a3b8" }} />
                <div className="uc-photo-text">Click to attach a photo of the issue</div>
                <div className="uc-photo-hint">JPG, PNG •” helps our expert prepare</div>
              </>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhotoChange} />
          </div>
        </div>
      </div>

      <div className="uc-step-footer">
        <button className="uc-btn-primary" onClick={onNext} disabled={!ok}>
          Review Booking <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP 6 •” CONFIRM
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function StepConfirm({ category, pkg, cart, date, time, formData, photoPreview, onBack, onSubmit, loading, error }) {
  const [agreed, setAgreed] = useState(false)
  const [payMethod, setPayMethod] = useState('cash') // 'cash' | 'online'
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [tip, setTip] = useState(null) // null | 50 | 75 | 100 | 'custom'
  const [customTip, setCustomTip] = useState('')
  const [showPayment, setShowPayment] = useState(false)

  const displayDate = date ? new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : ""
  const UC_TIME_FORMATS = (t) => { if (!t) return ''; const [h] = t.split(':').map(Number); const ampm = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:00 ${ampm}` }
  const displayTime = UC_TIME_FORMATS(time)
  const totalPrice = cart && cart.length > 0 ? cart.reduce((a, c) => a + (c.price * c.quantity), 0) : (pkg?.price || 0)
  const taxFee = totalPrice === 0 ? 49 : 99
  const discount = couponApplied ? Math.floor(totalPrice * 0.1) : 0
  const tipAmount = tip === 'custom' ? (parseInt(customTip) || 0) : (tip || 0)
  const grandTotal = totalPrice + taxFee - discount + tipAmount

  // Gather service/package info
  const serviceItems = cart && cart.length > 0 ? cart : (pkg ? [pkg] : [])

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', maxWidth: 960, margin: '0 auto', padding: '0 0 80px', flexWrap: 'wrap' }}>

      {/* LEFT: Payment Method + Details */}
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', color: '#64748b' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#0f172a' }}>Payment</div>
        </div>

        {/* Booking Summary Chips */}
        <div style={{ background: '#f8fafc', borderRadius: 14, padding: '14px 16px', marginBottom: 18, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {serviceItems.slice(0, 3).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'white', border: '1px solid #e2e8f0', borderRadius: 99, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, color: '#1e293b' }}>
                <CheckCircle2 size={11} color="#10B981" />{item.name}
              </div>
            ))}
            {serviceItems.length > 3 && <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7C3AED', padding: '4px 10px' }}>+{serviceItems.length - 3} more</div>}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {displayDate && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}><Calendar size={13} color="#7C3AED" /> {displayDate}</div>}
            {displayTime && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}><Clock size={13} color="#7C3AED" /> {displayTime}</div>}
            {formData.address && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.76rem', color: '#64748b', fontWeight: 600 }}><MapPin size={13} color="#7C3AED" /> {formData.address.slice(0, 40)}{formData.address.length > 40 ? '...' : ''}</div>}
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 18, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 7 }}>
            <CreditCard size={16} color="#7C3AED" /> Payment Method
          </div>

          {/* Online */}
          <div onClick={() => setPayMethod('online')} style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: payMethod === 'online' ? '#faf5ff' : 'white', transition: 'all 0.18s', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: payMethod === 'online' ? '#ede9fe' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>💳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                Pay Online
                <span style={{ background: '#ede9fe', color: '#7C3AED', fontSize: '0.58rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, border: '1px solid #ddd6fe' }}>RECOMMENDED</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>UPI / Card / NetBanking</div>
              {payMethod === 'online' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Card'].map(app => (
                    <span key={app} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, background: '#faf5ff', color: '#7C3AED' }}>{app}</span>
                  ))}
                </motion.div>
              )}
            </div>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${payMethod === 'online' ? '#7C3AED' : '#cbd5e1'}`, background: payMethod === 'online' ? '#7C3AED' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              {payMethod === 'online' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
            </div>
          </div>

          {/* Cash */}
          <div onClick={() => setPayMethod('cash')} style={{ padding: '16px 18px', cursor: 'pointer', background: payMethod === 'cash' ? '#faf5ff' : 'white', transition: 'all 0.18s', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: payMethod === 'cash' ? '#ede9fe' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>💵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                Pay After Service
                <span style={{ background: '#f0fdf4', color: '#10B981', fontSize: '0.58rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, border: '1px solid #bbf7d0' }}>CASH</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>Pay when the service is done</div>
              {payMethod === 'cash' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {['No upfront payment', 'Pay only on completion', 'Any denomination'].map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                      <CheckCircle2 size={11} /> {d}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${payMethod === 'cash' ? '#7C3AED' : '#cbd5e1'}`, background: payMethod === 'cash' ? '#7C3AED' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              {payMethod === 'cash' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
            </div>
          </div>
        </div>

        {/* Coupon */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>🏷️</span>
          {couponApplied ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, color: '#10B981', fontSize: '0.85rem' }}>✓ SAVE10 applied! You save ₹{discount}</div>
              <button onClick={() => { setCouponApplied(false); setCouponCode('') }} style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
            </div>
          ) : (
            <>
              <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter coupon code" style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', background: 'transparent' }} />
              <button onClick={() => { if (couponCode === 'SAVE10') setCouponApplied(true) }} style={{ padding: '6px 14px', borderRadius: 99, background: couponCode ? '#7C3AED' : '#e2e8f0', color: couponCode ? 'white' : '#94a3b8', fontWeight: 800, fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}>Apply</button>
            </>
          )}
        </div>


        {/* Agreement */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 18 }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: '#7C3AED', marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>I agree to the <a href="#" className="uc-link">Terms of Service</a> and <a href="#" className="uc-link">Privacy Policy</a>. The technician will arrive at the scheduled time.</span>
        </label>

        {error && <div className="uc-error"><AlertCircle size={13} /> {error}</div>}

        <button
          onClick={() => { if (agreed && !loading) { if (payMethod === 'online') setShowPayment(true); else onSubmit('cash') } }}
          disabled={!agreed || loading}
          style={{ width: '100%', padding: '15px', borderRadius: 14, background: agreed && !loading ? 'linear-gradient(135deg,#7C3AED,#a855f7)' : '#e2e8f0', color: agreed && !loading ? 'white' : '#94a3b8', fontWeight: 800, fontSize: '1rem', border: 'none', cursor: agreed && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: agreed && !loading ? '0 4px 20px rgba(124,58,237,0.3)' : 'none', transition: 'all 0.18s' }}
        >
          {loading ? <><RefreshCw size={16} className="spin-icon" /> Processing…</> : <><CheckCheck size={16} /> Confirm Booking · ₹{grandTotal.toLocaleString()}</>}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10, fontSize: '0.68rem', color: '#94a3b8' }}>
          <Shield size={11} /> 256-bit SSL · Your info is secure
        </div>
      </div>

      {/* RIGHT: Order Summary */}
      <div style={{ width: 300, flexShrink: 0, position: 'sticky', top: 24 }}>
        <div style={{ background: 'white', borderRadius: 18, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Order Summary</div>
          {serviceItems.map((item, i) => (
            <div key={i} style={{ padding: '12px 18px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b' }}>{item.name}</div>
                {item.quantity > 1 && <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>Qty: {item.quantity}</div>}
              </div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</div>
            </div>
          ))}

          {/* Tip Selector */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>
              💝 Tip for your professional <span style={{ fontSize: '0.58rem', color: '#10B981', fontWeight: 800, background: '#f0fdf4', padding: '2px 6px', borderRadius: 99, border: '1px solid #bbf7d0' }}>POPULAR</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[50, 75, 100].map(amt => (
                <button key={amt} onClick={() => setTip(tip === amt ? null : amt)} style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: `2px solid ${tip === amt ? '#7C3AED' : '#e2e8f0'}`, background: tip === amt ? '#ede9fe' : 'white', color: tip === amt ? '#7C3AED' : '#374151', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.18s' }}>₹{amt}</button>
              ))}
              <button onClick={() => setTip(tip === 'custom' ? null : 'custom')} style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: `2px solid ${tip === 'custom' ? '#7C3AED' : '#e2e8f0'}`, background: tip === 'custom' ? '#ede9fe' : 'white', color: tip === 'custom' ? '#7C3AED' : '#374151', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer', transition: 'all 0.18s' }}>Custom</button>
            </div>
            {tip === 'custom' && <input type="number" value={customTip} onChange={e => setCustomTip(e.target.value)} placeholder="Enter amount" style={{ marginTop: 8, width: '100%', padding: '8px 12px', border: '2px solid #7C3AED', borderRadius: 10, fontSize: '0.85rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />}
          </div>

          {/* Price Breakdown */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}><span>Item total</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹{totalPrice.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: discount > 0 ? 6 : 0 }}><span>Taxes & Fee</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹{taxFee}</span></div>
            {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#10B981', marginBottom: tipAmount > 0 ? 6 : 0 }}><span>Coupon discount</span><span style={{ fontWeight: 700 }}>-₹{discount}</span></div>}
            {tipAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}><span>Tip</span><span style={{ fontWeight: 700, color: '#1e293b' }}>₹{tipAmount}</span></div>}
          </div>

          <div style={{ padding: '14px 18px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>Amount to Pay</div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: 1 }}>Includes all taxes & fees</div>
            </div>
            <div style={{ fontWeight: 900, color: '#7C3AED', fontSize: '1.15rem' }}>₹{grandTotal.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Online Payment Modal */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal
            total={grandTotal}
            allowedMethods={['online']}
            onClose={() => setShowPayment(false)}
            onConfirm={(method) => { setShowPayment(false); onSubmit(method) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   PAYMENT MODAL
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function PaymentModal({ total, allowedMethods = ['cash', 'online'], onClose, onConfirm, bookingId }) {
  const [selected, setSelected] = useState(allowedMethods.includes('online') && allowedMethods.length === 1 ? 'online' : 'cash')
  const [confirming, setConfirming] = useState(false)
  const [showOnlineSheet, setShowOnlineSheet] = useState(false)
  const [payTab, setPayTab] = useState('upi')
  const [upiId, setUpiId] = useState('')
  const [cardNum, setCardNum] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [payPhase, setPayPhase] = useState(null) // null | 'processing' | 'success' | 'failed'
  const [payError, setPayError] = useState('')

  const handleConfirm = async () => {
    if (selected === 'online') {
      setShowOnlineSheet(true)
    } else {
      setConfirming(true)
      await new Promise(r => setTimeout(r, 400))
      onConfirm('cash')
    }
  }

  const handleOnlinePayment = async () => {
    setPayPhase('processing')
    setPayError('')
    await new Promise(r => setTimeout(r, 2200))
    const success = Math.random() > 0.05
    if (success) {
      setPayPhase('success')
      if (bookingId) {
        try {
          await apiRequest('/payment/verify/', {
            method: 'POST',
            json: { booking_id: bookingId, order_id: `order_mock_${Date.now()}`, payment_id: `PAY_${Date.now().toString(36).toUpperCase()}`, mock_success: true }
          })
        } catch (e) { /* non-critical */ }
      }
      await new Promise(r => setTimeout(r, 1200))
      onConfirm('online')
    } else {
      setPayPhase('failed')
      setPayError('Payment failed. Please check your details and try again.')
    }
  }

  const options = [
    { id: "cash", icon: "ðŸ’µ", label: "Cash on Service", sub: "Pay after service is completed", badge: "Most Popular", badgeColor: "#10B981", detail: ["No upfront payment", "Pay only on completion", "Any denomination accepted"] },
    { id: "online", icon: "ðŸ“±", label: "Pay via UPI", sub: "Google Pay, PhonePe, Paytm, BHIM", badge: "Instant", badgeColor: "#7C3AED", detail: ["100% secure & encrypted", "Instant confirmation", "Invoice emailed immediately"] },
  ].filter(o => allowedMethods.includes(o.id))

  if (showOnlineSheet) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 10020, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <motion.div initial={{ y: 400, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{ background: 'white', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 540, paddingBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', borderRadius: '28px 28px 0 0', padding: '1.5rem 1.75rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Secure UPI Payment</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginTop: 2 }}>{BOOKING_CURRENCY_SYMBOL}{total.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Lock size={11} /> SSL Secured
              </div>
            </div>
          </div>
          <div style={{ padding: '1.5rem 1.75rem' }}>
            {payPhase === 'processing' && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: '1.5rem' }}><RefreshCw size={48} color="#7C3AED" /></motion.div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Processing UPI Payment•¦</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Please do not close this window</div>
              </div>
            )}
            {payPhase === 'success' && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#10B981,#34D399)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <Check size={36} color="white" />
                </motion.div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Payment Successful! ðŸŽ‰</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Your booking is now confirmed</div>
                <div style={{ marginTop: '1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>•œ… Amount {BOOKING_CURRENCY_SYMBOL}{total.toLocaleString()} debited successfully</div>
              </div>
            )}
            {payPhase === 'failed' && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '2px solid #FECACA' }}><X size={36} color="#EF4444" /></div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Payment Failed</div>
                <div style={{ color: '#EF4444', fontSize: '0.82rem', marginBottom: '1.25rem' }}>{payError}</div>
                <button onClick={() => setPayPhase(null)} style={{ padding: '0.75rem 2rem', background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', color: 'white', fontWeight: 800, border: 'none', borderRadius: 12, cursor: 'pointer' }}>Try Again</button>
              </div>
            )}
            {payPhase === null && (
              <>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Enter UPI ID</label>
                <div style={{ display: 'flex', alignItems: 'center', border: `2px solid ${upiId ? '#7C3AED' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi"
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '0.9rem 1rem', fontSize: '0.95rem', color: '#0f172a' }} />
                  <div style={{ padding: '0 1rem', color: '#7C3AED', fontWeight: 800, fontSize: '0.75rem' }}>VERIFY</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                  {['PhonePe', 'GPay', 'Paytm', 'BHIM'].map(app => (
                    <button key={app} onClick={() => setUpiId(app.toLowerCase() + '@ybl')}
                      style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: 'white', color: '#374151' }}>{app}</button>
                  ))}
                </div>
                <button onClick={handleOnlinePayment} disabled={!upiId}
                  style={{ width: '100%', padding: '1rem', background: upiId ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : '#e2e8f0', color: upiId ? 'white' : '#94a3b8', fontWeight: 800, fontSize: '0.95rem', border: 'none', borderRadius: 14, cursor: upiId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Lock size={15} /> Pay {BOOKING_CURRENCY_SYMBOL}{total.toLocaleString()}
                </button>
              </>
            )}
            {payPhase === null && (
              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Shield size={11} /> 256-bit SSL Â· UPI Encryption
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 10010, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <motion.div initial={{ y: 300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 520, paddingBottom: '2.5rem' }}>
        <div style={{ padding: '1.75rem 1.75rem 0' }}>
          <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 1.5rem' }} />
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>Choose Payment Method</h3>
          <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>Total: <strong style={{ color: '#7C3AED', fontSize: '1.05rem' }}>{BOOKING_CURRENCY_SYMBOL}{total.toLocaleString()}</strong></p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0 1.75rem', marginBottom: '1.25rem' }}>
          {options.map(opt => (
            <div key={opt.id} onClick={() => setSelected(opt.id)}
              style={{ border: `2px solid ${selected === opt.id ? '#7C3AED' : '#e2e8f0'}`, borderRadius: 16, padding: '1rem 1.1rem', cursor: 'pointer', background: selected === opt.id ? '#f5f3ff' : 'white', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: selected === opt.id ? '#7C3AED18' : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>{opt.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {opt.label}
                    <span style={{ background: opt.badgeColor + '18', color: opt.badgeColor, fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, border: `1px solid ${opt.badgeColor}30` }}>{opt.badge}</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 3 }}>{opt.sub}</div>
                  {selected === opt.id && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {opt.detail.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', color: '#059669', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> {d}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected === opt.id ? '#7C3AED' : '#cbd5e1'}`, background: selected === opt.id ? '#7C3AED' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {selected === opt.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '0 1.75rem' }}>
          <button onClick={handleConfirm} disabled={confirming}
            style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', fontWeight: 800, fontSize: '1rem', border: 'none', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
            {confirming ? <><RefreshCw size={16} className="spin-icon" /> Processing•¦</> :
              selected === 'online' ? <><CreditCard size={16} /> Continue to Pay {BOOKING_CURRENCY_SYMBOL}{total.toLocaleString()}</> :
                <><CheckCheck size={16} /> Confirm Booking</>}
          </button>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Shield size={11} /> 256-bit SSL encrypted Â· Your info is safe
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   POST-BOOKING ANIMATED FLOW
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function PostBookingFlow({ bookingData, category, cart, formData, selDate, selTime, onDone }) {
  const [phase, setPhase] = useState(0)

  const MOCK_TECH = {
    name: "Ravi Kumar",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 4.9,
    jobs: 284,
    eta: "25 mins",
  }

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1500),
      setTimeout(() => setPhase(2), 3500),
      setTimeout(() => setPhase(3), 5500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const phases = [
    {
      icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><RefreshCw size={52} color="#7C3AED" /></motion.div>,
      title: "Creating your booking•¦",
      sub: "Submitting your service request securely",
    },
    {
      icon: <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}><Users size={52} color="#F59E0B" /></motion.div>,
      title: "Finding your expert•¦",
      sub: "Matching you with the best professional nearby",
    },
    {
      icon: <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}><CheckCircle2 size={52} color="#10B981" /></motion.div>,
      title: "Professional Assigned! •œ…",
      sub: "Your expert is confirmed and on their way",
    },
    {
      icon: <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}><span style={{ fontSize: '3.5rem' }}>ðŸŽ‰</span></motion.div>,
      title: "Booking Confirmed!",
      sub: "Your booking is all set. Tap below to track.",
    },
  ]

  const cur = phases[phase]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', zIndex: 10005, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '2rem' }}>
      {/* Step tracker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '3rem' }}>
        {['Booking Created', 'Searching', 'Assigned', 'Confirmed'].map((label, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: i <= phase ? (i < phase ? '#10B981' : '#7C3AED') : 'rgba(255,255,255,0.15)', border: `2px solid ${i <= phase ? (i < phase ? '#10B981' : '#7C3AED') : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.5s' }}>
                {i < phase ? <Check size={16} color="white" /> : <span style={{ fontSize: '0.75rem', fontWeight: 800, color: i <= phase ? 'white' : 'rgba(255,255,255,0.4)' }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: i <= phase ? 'white' : 'rgba(255,255,255,0.35)', maxWidth: 60, textAlign: 'center' }}>{label}</span>
            </div>
            {i < 3 && <div style={{ width: 40, height: 2, background: i < phase ? '#10B981' : 'rgba(255,255,255,0.15)', transition: 'background 0.5s', marginBottom: 22, flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.4 }}
          style={{ background: 'white', borderRadius: 24, padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 360, width: '100%', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}
        >
          <div style={{ marginBottom: '1.25rem' }}>{cur.icon}</div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>{cur.title}</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{cur.sub}</p>

          {phase === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ marginTop: '1.5rem', background: '#f8fafc', borderRadius: 14, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <img src={MOCK_TECH.avatar} alt={MOCK_TECH.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #7C3AED30' }} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{MOCK_TECH.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>•­ {MOCK_TECH.rating} Â· {MOCK_TECH.jobs} jobs</div>
              </div>
              <div style={{ background: '#10B98115', color: '#10B981', fontWeight: 800, fontSize: '0.7rem', padding: '4px 10px', borderRadius: 99, border: '1px solid #10B98130' }}>ETA {MOCK_TECH.eta}</div>
            </motion.div>
          )}

          {phase === 3 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              onClick={() => onDone(MOCK_TECH)}
              style={{ marginTop: '1.5rem', width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', fontWeight: 800, fontSize: '0.95rem', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <MapPin size={16} /> Track My Booking
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   LIVE TRACKING PAGE
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

function LiveTrackingPage({ successData, technician, category, cart, formData, selDate, selTime, onBookAgain }) {
  const rid = successData?.request_id || successData?.id || "BK" + Date.now().toString().slice(-6)
  const [etaMinutes, setEtaMinutes] = useState(25)
  const totalPrice = cart ? cart.reduce((a, c) => a + (c.price * c.quantity), 0) : 0
  const displayDate = selDate ? new Date(selDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""
  const displayTime = selTime ? TIME_SLOTS.flatMap(g => g.slots).find(s => s.t === selTime)?.l : ""

  const trackSteps = [
    { label: "Booking Confirmed", icon: "•œ…", done: true, time: "Just now" },
    { label: "Expert Assigned", icon: "ðŸ‘¨•ðŸ”§", done: false, time: "Pending" },
    { label: "Expert On The Way", icon: "ðŸ›µ", done: false, time: "Pending" },
    { label: "Service In Progress", icon: "•š™ï¸", done: false, time: "Scheduled" },
    { label: "Service Completed", icon: "ðŸŒŸ", done: false, time: "Pending" },
  ]

  useEffect(() => {
    if (etaMinutes <= 0) return
    const t = setInterval(() => setEtaMinutes(m => m > 0 ? m - 1 : 0), 60000)
    return () => clearInterval(t)
  }, [etaMinutes])

  const tech = technician || { name: "Ravi Kumar", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", rating: 4.9, jobs: 284, eta: "25 mins" }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}
        >
          <CheckCircle2 size={44} color="white" />
        </motion.div>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>Booking Confirmed! ðŸŽ‰</h2>
        <p style={{ margin: '0 0 0.5rem', color: '#64748b', fontSize: '0.9rem' }}>Your expert is on the way</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f5f3ff', border: '1px solid #7C3AED30', borderRadius: 99, padding: '6px 16px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase' }}>Booking Ref</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>#{rid}</span>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: 'white', borderRadius: 20, padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <img src={tech.avatar} alt={tech.name} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #7C3AED30' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: '#10B981', border: '2px solid white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>{tech.name}</div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>•­ {tech.rating} Â· {tech.jobs} jobs completed</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <span style={{ background: '#10B98112', color: '#10B981', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, border: '1px solid #10B98125' }}>Verified Pro</span>
              <span style={{ background: '#7C3AED12', color: '#7C3AED', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99, border: '1px solid #7C3AED25' }}>Background Checked</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', borderRadius: 12, padding: '0.6rem 1rem', color: 'white' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{etaMinutes}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700 }}>MIN ETA</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button onClick={() => alert(`Calling ${tech.name}...`)}
            style={{ flex: 1, padding: '0.7rem', background: '#7C3AED', color: 'white', fontWeight: 700, fontSize: '0.85rem', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Phone size={15} /> Call Expert
          </button>
          <button onClick={() => alert("Chat feature coming soon!")}
            style={{ flex: 1, padding: '0.7rem', background: '#f1f5f9', color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <MessageSquare size={15} /> Chat
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        style={{ background: 'white', borderRadius: 20, padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}
      >
        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.75rem' }}>ðŸ“‹ Booking Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.8rem' }}>
          {[
            { label: 'Service', value: category?.name },
            { label: 'Date', value: displayDate },
            { label: 'Time', value: displayTime },
            { label: 'Address', value: formData?.address, span: true },
            { label: 'Total Amount', value: `${BOOKING_CURRENCY_SYMBOL}${totalPrice}`, highlight: true },
          ].map((r, i) => (
            <div key={i} style={{ ...(r.span ? { gridColumn: '1/-1' } : {}), background: '#f8fafc', borderRadius: 10, padding: '0.5rem 0.75rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{r.label}</div>
              <div style={{ fontWeight: 700, color: r.highlight ? '#7C3AED' : '#0f172a', marginTop: 2 }}>{r.value || '•”'}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{ background: 'white', borderRadius: 20, padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}
      >
        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.75rem' }}>ðŸ—ºï¸ Live Tracking</div>
        {trackSteps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.5rem 0', position: 'relative' }}>
            {i < trackSteps.length - 1 && <div style={{ position: 'absolute', left: 18, top: 36, width: 2, height: 24, background: s.done ? '#10B981' : '#e2e8f0' }} />}
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: s.done ? '#10B98115' : '#f8fafc', border: `2px solid ${s.done ? '#10B981' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
              {s.done ? <Check size={16} color="#10B981" /> : s.icon}
            </div>
            <div style={{ flex: 1, paddingTop: 6 }}>
              <div style={{ fontWeight: 700, color: s.done ? '#0f172a' : '#94a3b8', fontSize: '0.85rem' }}>{s.label}</div>
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: s.done ? '#10B981' : '#94a3b8', paddingTop: 8 }}>{s.time}</div>
          </div>
        ))}
      </motion.div>

      <button onClick={onBookAgain}
        style={{ width: '100%', padding: '1rem', background: '#f1f5f9', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', border: 'none', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Home size={16} /> Book Another Service
      </button>
    </motion.div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   STEP INDICATOR BAR
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

const STEP_LABELS = ["Service", "Package", "Schedule", "Identity", "Details", "Confirm"]

function StepBar({ step, total }) {
  return (
    <div className="uc-stepbar">
      {STEP_LABELS.slice(0, total).map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <React.Fragment key={label}>
            <div className={`uc-sb-step ${done ? "uc-sb-done" : ""} ${active ? "uc-sb-active" : ""}`}>
              <div className="uc-sb-dot">
                {done ? <Check size={10} /> : n}
              </div>
              <span className="uc-sb-label">{label}</span>
            </div>
            {i < total - 1 && <div className={`uc-sb-line ${done ? "uc-sb-line-done" : ""}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   MAIN PAGE
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

/* •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
   CUSTOMER ACCOUNT MODAL
   •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”• */

export function CustomerAccountModal({ activeTab, onClose, onChangeTab }) {
  const { user, refreshMe, loginWithGoogle, loginWithCustomerGoogle } = useAuth()

  const [loginMethod, setLoginMethod] = useState('email')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPhone, setLoginPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleRequestOTP = async () => {
    setLoginError('')
    setLoginLoading(true)
    try {
      if (loginMethod === 'email') await apiRequestCustomerEmailOTP(loginEmail)
      else await apiRequestCustomerPhoneOTP(loginPhone)
      setOtpSent(true)
    } catch (e) {
      setLoginError(e.body?.detail || 'Failed to send OTP')
    }
    setLoginLoading(false)
  }

  const handleVerifyOTP = async () => {
    setLoginError('')
    setLoginLoading(true)
    try {
      if (loginMethod === 'email') await apiVerifyCustomerEmailOTP(loginEmail, otpValue)
      else await apiVerifyCustomerPhoneOTP(loginPhone, otpValue)
      await refreshMe()
      if (onClose) onClose()
    } catch (e) {
      setLoginError(e.body?.detail || 'Invalid OTP')
    }
    setLoginLoading(false)
  }

  const handleLogout = async () => {
    await apiLogout()
    await refreshMe()
  }

  const googleLoginHandler = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tr) => {
      setLoginLoading(true);
      setLoginError("");
      try {
        if (typeof loginWithCustomerGoogle === 'function') {
          await loginWithCustomerGoogle(tr.access_token);
        } else {
          await apiCustomerGoogleLogin(tr.access_token);
        }
        await refreshMe();
        if (onClose) onClose();
      } catch (err) {
        setLoginError(extractAuthError(err, "Google login failed"));
      } finally {
        setLoginLoading(false);
      }
    },
    onError: (err) => {
      console.error("Google OAuth error:", err);
      setLoginLoading(false);
      setLoginError(err?.error_description || err?.error || "Google sign-in was cancelled or failed.");
    }
  });

  const [selectedMockBooking, setSelectedMockBooking] = useState(null)

  const [realBookings, setRealBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')

  useEffect(() => {
    if (user) {
      const uFullName = user?.firstName ? `${user.firstName} ${user?.lastName || ''}`.trim() : ''
      setProfileName(uFullName)
      setProfilePhone(user?.phone || '')
      setProfileEmail(user?.email || '')
    }
  }, [user])

  const handleSaveProfile = async () => {
    setProfileError('')
    setProfileSuccess('')
    setIsSavingProfile(true)
    const nameParts = profileName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ')

    try {
      const res = await apiRequest("/auth/profile/", {
        method: "PATCH",
        json: {
          first_name: firstName,
          last_name: lastName,
          phone: profilePhone,
          email: profileEmail
        }
      })
      if (res.success || res.id) {
        await refreshMe()
        setProfileSuccess("Changes saved successfully!")
      } else {
        setProfileError(res.message || "Failed to update profile")
      }
    } catch (e) {
      setProfileError(e.body?.message || "Failed to update profile")
    } finally {
      setIsSavingProfile(false)
    }
  }

  useEffect(() => {
    if (activeTab === "My Bookings" && user) {
      setBookingsLoading(true)
      apiFetchCustomerBookings()
        .then(res => setRealBookings(res.data || []))
        .catch(console.error)
        .finally(() => setBookingsLoading(false))
    }
  }, [activeTab, user])

  // •”••”• Reschedule State •”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”••”•
  // ── Reschedule State ────────────────────────────────────────────────────────
  const [reschedules, setReschedules] = useState([])
  const [reschedulesLoading, setReschedulesLoading] = useState(false)
  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [rescheduleBookingId, setRescheduleBookingId] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('09-10')
  const [rescheduleReason, setRescheduleReason] = useState('schedule_conflict')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')
  const [rescheduleSuccess, setRescheduleSuccess] = useState('')

  const [activeBookings, setActiveBookings] = useState([])
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // ── Refund State ──────────────────────────────────────────────────────────
  const [refunds, setRefunds] = useState([])
  const [refundsLoading, setRefundsLoading] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundBookingId, setRefundBookingId] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('POOR_QUALITY')
  const [refundSubmitting, setRefundSubmitting] = useState(false)
  const [refundError, setRefundError] = useState('')
  const [refundSuccess, setRefundSuccess] = useState('')

  const [eligibleRefundBookings, setEligibleRefundBookings] = useState([])
  const [refundSummary, setRefundSummary] = useState(null)
  const [refundSummaryLoading, setRefundSummaryLoading] = useState(false)
  const [refundType, setRefundType] = useState('FULL')
  const [refundRequestedAmount, setRefundRequestedAmount] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [refundFiles, setRefundFiles] = useState([])
  const [expandedRefundId, setExpandedRefundId] = useState(null)

  // ── Complaint State ─────────────────────────────────────────────────────────
  const [complaints, setComplaints] = useState([])
  const [complaintsLoading, setComplaintsLoading] = useState(false)
  const [showComplaintForm, setShowComplaintForm] = useState(false)
  const [complaintBookingId, setComplaintBookingId] = useState('')
  const [complaintCategory, setComplaintCategory] = useState('OTHER')
  const [complaintDesc, setComplaintDesc] = useState('')
  const [complaintSubmitting, setComplaintSubmitting] = useState(false)
  const [complaintError, setComplaintError] = useState('')
  const [complaintSuccess, setComplaintSuccess] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [complaintReply, setComplaintReply] = useState('')
  const [complaintReplying, setComplaintReplying] = useState(false)

  // ── Saved Addresses State ───────────────────────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)

  const [addrLabel, setAddrLabel] = useState('home')
  const [addrLine1, setAddrLine1] = useState('')
  const [addrLine2, setAddrLine2] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [addrPincode, setAddrPincode] = useState('')
  const [addrPhone, setAddrPhone] = useState('')
  const [addrIsDefault, setAddrIsDefault] = useState(false)
  const [addrSubmitting, setAddrSubmitting] = useState(false)
  const [addrError, setAddrError] = useState('')
  const [addrSuccess, setAddrSuccess] = useState('')
  const [addrAccuracy, setAddrAccuracy] = useState(null)

  const [mapAddress, setMapAddress] = useState(null)

  const humanizeLastUsed = (isoStr) => {
    if (!isoStr) return 'Never used'
    try {
      const d = new Date(isoStr)
      const diffMs = new Date() - d
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffSecs / 60)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSecs < 60) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 30) return `${diffDays} days ago`
      return d.toLocaleDateString()
    } catch {
      return 'Recently'
    }
  }

  const fetchAddresses = () => {
    setAddressesLoading(true)
    apiRequest('/auth/customer/addresses/')
      .then(r => {
        if (r && Array.isArray(r.data)) {
          setSavedAddresses(r.data)
        } else if (Array.isArray(r)) {
          setSavedAddresses(r)
        } else {
          setSavedAddresses([])
        }
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setAddressesLoading(false))
  }

  useEffect(() => {
    if (activeTab === 'Saved Addresses') {
      fetchAddresses()
    }
  }, [activeTab, user])

  useEffect(() => {
    if (activeTab === 'My Reschedules' && user) {
      setReschedulesLoading(true)
      apiRequest('/customer/reschedules/')
        .then(r => setReschedules(r.data || []))
        .catch(() => apiRequest('/booking/reschedule/').then(r => setReschedules(r.data || [])).catch(() => setReschedules([])))
        .finally(() => setReschedulesLoading(false))

      apiRequest('/customer/active-bookings/')
        .then(r => {
          const list = r.data || []
          setActiveBookings(list)
          if (list.length > 0 && !rescheduleBookingId) {
            setRescheduleBookingId(list[0].id)
          }
        })
        .catch(() => {
          apiRequest('/booking/my-bookings/').then(r => {
            const list = r.data || []
            setActiveBookings(list)
            if (list.length > 0 && !rescheduleBookingId) setRescheduleBookingId(list[0].id)
          }).catch(console.error)
        })
    }
  }, [activeTab, user])

  useEffect(() => {
    if (rescheduleBookingId && rescheduleDate) {
      setSlotsLoading(true)
      apiRequest(`/customer/bookings/${rescheduleBookingId}/slots/?date=${rescheduleDate}`)
        .then(r => {
          const slots = r.data || []
          setAvailableSlots(slots)
          const firstAvail = slots.find(s => s.is_available)
          if (firstAvail) setRescheduleTimeSlot(firstAvail.time_slot)
        })
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false))
    }
  }, [rescheduleBookingId, rescheduleDate])

  const fetchCustomerRefundData = () => {
    setRefundsLoading(true)
    apiRequest('/customer/refunds/')
      .then(r => setRefunds(r.data || []))
      .catch(() => apiRequest('/booking/refunds/').then(r => setRefunds(r.data || [])).catch(() => setRefunds([])))
      .finally(() => setRefundsLoading(false))

    apiRequest('/customer/refunds/eligible-bookings/')
      .then(r => {
        const list = r.data || []
        setEligibleRefundBookings(list)
        if (list.length > 0 && !refundBookingId) {
          setRefundBookingId(list[0].id)
        }
      })
      .catch(() => setEligibleRefundBookings([]))
  }

  useEffect(() => {
    if (activeTab === 'My Refunds' && user) {
      fetchCustomerRefundData()
    }
  }, [activeTab, user])

  useEffect(() => {
    if (refundBookingId) {
      setRefundSummaryLoading(true)
      apiRequest(`/customer/refunds/bookings/${refundBookingId}/summary/`)
        .then(r => {
          setRefundSummary(r.data)
          if (refundType === 'FULL' && r.data?.paid_amount) {
            setRefundRequestedAmount(r.data.paid_amount)
          }
        })
        .catch(() => setRefundSummary(null))
        .finally(() => setRefundSummaryLoading(false))
    }
  }, [refundBookingId, refundType])

  const handleSubmitReschedule = async () => {
    setRescheduleError(''); setRescheduleSuccess(''); setRescheduleSubmitting(true)
    try {
      const payload = {
        booking_id: rescheduleBookingId,
        new_date: rescheduleDate,
        new_time_slot: rescheduleTimeSlot,
        reason: rescheduleReason,
        additional_notes: rescheduleNotes,
      }
      let res;
      try {
        res = await apiRequest('/customer/reschedules/create/', { method: 'POST', json: payload })
      } catch (e) {
        res = await apiRequest('/booking/reschedule/', { method: 'POST', json: payload })
      }
      if (res.success || res.status === 'success') {
        setRescheduleSuccess('Reschedule request submitted successfully!')
        setShowRescheduleForm(false)
        setRescheduleDate('')
        setRescheduleNotes('')
        try {
          const updated = await apiRequest('/customer/reschedules/')
          setReschedules(updated.data || [])
        } catch (e) {
          const updated = await apiRequest('/booking/reschedule/')
          setReschedules(updated.data || [])
        }
      } else {
        setRescheduleError(res.error?.message || res.message || 'Failed to submit reschedule request.')
      }
    } catch (e) {
      setRescheduleError(e?.body?.message || e?.message || 'Failed to submit reschedule request.')
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  const handleSubmitRefund = async () => {
    setRefundError(''); setRefundSuccess(''); setRefundSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('booking_id', refundBookingId)
      formData.append('refund_type', refundType)
      formData.append('requested_amount', refundType === 'FULL' ? (refundSummary?.paid_amount || refundRequestedAmount) : refundRequestedAmount)
      formData.append('reason', refundReason || 'POOR_QUALITY')
      formData.append('additional_notes', refundNotes)

      if (refundFiles && refundFiles.length > 0) {
        for (let i = 0; i < refundFiles.length; i++) {
          formData.append('evidence', refundFiles[i])
        }
      }

      const token = localStorage.getItem('token') || localStorage.getItem('access_token')
      const response = await fetch('/api/customer/refunds/create/', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      })

      const res = await response.json()
      if (res.success || response.ok) {
        setRefundSuccess('Refund request submitted successfully!')
        setShowRefundForm(false)
        setRefundNotes('')
        setRefundFiles([])
        fetchCustomerRefundData()
      } else {
        const errObj = res.error || {}
        setRefundError(errObj.message || res.message || 'Failed to submit refund request.')
      }
    } catch (e) {
      setRefundError(e?.message || 'Failed to submit refund request.')
    } finally {
      setRefundSubmitting(false)
    }
  }

  const handleSubmitComplaint = async () => {
    setComplaintError(''); setComplaintSuccess(''); setComplaintSubmitting(true)
    try {
      const res = await apiRequest('/booking/complaints/create/', { method: 'POST', json: { booking_id: complaintBookingId || undefined, category: complaintCategory, description: complaintDesc } })
      if (res.success) {
        setComplaintSuccess('Complaint submitted! We will respond within 24 hours.')
        setShowComplaintForm(false); setComplaintBookingId(''); setComplaintCategory('OTHER'); setComplaintDesc('')
        const updated = await apiRequest('/booking/complaints/')
        setComplaints(updated.data || [])
      } else { setComplaintError(res.message || 'Failed to submit') }
    } catch (e) { setComplaintError(e?.body?.message || 'Failed to submit') }
    finally { setComplaintSubmitting(false) }
  }

  const handleComplaintReply = async (complaintId) => {
    if (!complaintReply.trim()) return
    setComplaintReplying(true)
    try {
      await apiRequest(`/booking/complaints/${complaintId}/response/`, { method: 'POST', json: { message: complaintReply } })
      setComplaintReply('')
      const res = await apiRequest(`/booking/complaints/${complaintId}/`)
      setSelectedComplaint(res.data)
    } catch (e) { console.error(e) }
    finally { setComplaintReplying(false) }
  }


  const userFullName = user?.firstName ? `${user.firstName} ${user?.lastName || ''}`.trim() : 'Customer'
  const userEmail = user?.email || ''
  const userPhone = user?.phone || ''

  const [mockAddresses, setMockAddresses] = useState([
    { id: 1, title: 'Home', address: 'Flat 402, Block A\nPrestige Sunrise\nBangalore, 560068' }
  ])
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [newAddressTitle, setNewAddressTitle] = useState('')
  const [newAddressText, setNewAddressText] = useState('')

  const handleAddAddress = () => {
    if (newAddressTitle.trim() && newAddressText.trim()) {
      if (editingAddressId) {
        setMockAddresses(mockAddresses.map(a => a.id === editingAddressId ? { ...a, title: newAddressTitle, address: newAddressText } : a))
      } else {
        setMockAddresses([...mockAddresses, { id: Date.now(), title: newAddressTitle, address: newAddressText }])
      }
      setIsAddingAddress(false)
      setEditingAddressId(null)
      setNewAddressTitle('')
      setNewAddressText('')
    }
  }

  const handleEditClick = (address) => {
    setEditingAddressId(address.id)
    setNewAddressTitle(address.title)
    setNewAddressText(address.address)
    setIsAddingAddress(true)
  }

  const handleRemoveAddress = (id) => {
    setMockAddresses(mockAddresses.filter(a => a.id !== id))
  }

  const [geoAddressLoading, setGeoAddressLoading] = useState(false)

  const handleDetectLocationForAddress = () => {
    if (!navigator.geolocation) {
      setAddrError("Geolocation is not supported by your browser.")
      return
    }
    setGeoAddressLoading(true)
    setAddrError("")
    setAddrSuccess("")
    setAddrAccuracy(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        const acc = Math.round(pos.coords.accuracy)
        const rating = acc <= 30 ? 'high' : acc <= 100 ? 'acceptable' : 'low'
        setAddrAccuracy({ meters: acc, rating })

        try {
          let line1 = ""
          let city = ""
          let state = ""
          let pincode = ""

          try {
            const backendDetect = await apiDetectCustomerLocation(lat, lng, acc)
            if (backendDetect && backendDetect.success && backendDetect.data) {
              const d = backendDetect.data
              const parts = [d.area, d.formatted_address ? d.formatted_address.split(',')[0] : ''].filter(Boolean)
              line1 = parts.filter((v, i, a) => a.indexOf(v) === i).join(', ')
              city = d.city
              state = d.state
              pincode = d.pincode
            }
          } catch (err) {
            console.warn("Backend detect fallback:", err)
          }

          if (!line1) {
            try {
              const fullAddr = await getAddress(lat, lng)
              if (fullAddr) {
                line1 = fullAddr
              }
            } catch (e) {
              console.warn("Reverse geocode warning:", e)
            }
          }

          // Hosur Geo-fencing & Pincode Resolution
          if ((pincode && pincode.startsWith("635")) || (12.55 <= lat && lat <= 12.85 && 77.70 <= lng && lng <= 77.98)) {
            city = "Hosur"
            state = "Tamil Nadu"
            if (!pincode) pincode = "635109"
          }

          if (!line1) line1 = `GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
          if (!city) city = "Hosur"
          if (!state) state = "Tamil Nadu"
          if (!pincode) pincode = "635109"

          setAddrLine1(line1)
          setAddrCity(city)
          setAddrState(state)
          setAddrPincode(pincode)

          // Update last_known_location for session
          await apiUpdateCustomerLastLocation({
            latitude: lat,
            longitude: lng,
            label: line1,
            detected_at: new Date().toISOString()
          })

          setShowAddressForm(true)
          if (rating === 'low') {
            setAddrError(`⚠️ Location accuracy is low (~${acc}m). Please move outdoors or refine your street address details before saving.`)
          } else {
            setAddrSuccess(`📍 Current location detected (~${acc}m accuracy). Please review your address details below and click Confirm & Save Address.`)
          }

          if (typeof refreshMe === 'function') await refreshMe()
        } catch (e) {
          setAddrError("Failed to fetch address details for detected GPS coordinates.")
        } finally {
          setGeoAddressLoading(false)
        }
      },
      (err) => {
        setGeoAddressLoading(false)
        if (err.code === 1) {
          setAddrError("Location permission denied. Please allow location access in your browser settings.")
        } else if (err.code === 2) {
          setAddrError("Unable to detect high-accuracy GPS position. Please try again.")
        } else if (err.code === 3) {
          setAddrError("GPS request timed out. Please try again.")
        } else {
          setAddrError("Failed to detect location. Please enter manually.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const nonDraftBookings = (realBookings || []).filter(b => b.status !== 'draft')
  const hasNonDraftBookings = nonDraftBookings.length > 0

  const tabs = [
    { id: "My Profile", icon: User },
    { id: "Saved Addresses", icon: MapPin },
    { id: "My Bookings", icon: Calendar, badge: nonDraftBookings.length || undefined },
    { id: "Help & Support", icon: LifeBuoy },
  ]

  const mockBookings = [
    { id: "BK482910", service: "AC Servicing", date: "Aug 15, 2026", status: "Completed", amount: BOOKING_CURRENCY_SYMBOL + "899" },
    { id: "BK483122", service: "Deep Cleaning", date: "Sep 02, 2026", status: "Upcoming", amount: BOOKING_CURRENCY_SYMBOL + "2,499" },
  ]
  const renderBookedSubmodulesSummary = (b) => {
    if (!b) return null;
    let parsedCart = [];
    if (typeof b.cart_data === 'string') {
      try { parsedCart = JSON.parse(b.cart_data); } catch (e) { }
    } else if (Array.isArray(b.cart_data)) {
      parsedCart = b.cart_data;
    }

    if (!parsedCart || parsedCart.length === 0) return null;

    return (
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 14px', border: '1px solid #e2e8f0', marginTop: 10 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>📦</span> Booked Service Submodules ({parsedCart.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {parsedCart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#0f172a' }}>
              <span style={{ fontWeight: 600 }}>
                • {item.name || item.title || item.service_name || item.tier || 'Service Submodule'}
                {item.categoryName ? <span style={{ color: '#64748b', fontWeight: 400 }}> ({item.categoryName})</span> : ''}
              </span>
              <span style={{ fontWeight: 700, color: '#059669' }}>
                Qty: {item.quantity || 1} &nbsp;•&nbsp; ₹{(parseFloat(item.price || item.estimated_price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "My Profile":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My Profile</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #e2e8f0' }}>
                <User size={36} color="#94a3b8" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 4 }}>{userFullName}</div>
                <div style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 12 }}>{userEmail || userPhone}</div>
                <button style={{ padding: '0.5rem 1.25rem', background: 'white', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Change Photo</button>
              </div>
            </div>

            {profileError && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, marginBottom: 16 }}>{profileError}</div>}
            {profileSuccess && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, marginBottom: 16 }}>{profileSuccess}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 8 }}>Full Name</label>
                <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 8 }}>Phone Number</label>
                <input type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 8 }}>Email Address</label>
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }} />
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={isSavingProfile} style={{ marginTop: 32, padding: '0.9rem 2.5rem', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(5, 150, 105, 0.25)', opacity: isSavingProfile ? 0.7 : 1 }}>
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </motion.div>
        )
      case "My Bookings":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My Bookings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {bookingsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading bookings...</div>
              ) : realBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#f8fafc', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(5,150,105,0.15)' }}>
                    <Calendar size={30} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.15rem', color: '#0f172a' }}>No Active Bookings Yet</h4>
                  <p style={{ margin: '0 auto 20px', fontSize: '0.85rem', color: '#64748b', maxWidth: 360, lineHeight: 1.5 }}>
                    You haven't placed any service bookings yet. Browse our top home services and book an expert with instant slot confirmation.
                  </p>
                  <button
                    onClick={() => { onClose(); setStep(1); }}
                    style={{ padding: '12px 24px', background: '#059669', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.25)' }}
                  >
                    + Book a Service Now
                  </button>
                </div>
              ) : realBookings.map(b => {
                const isRescheduleEligible = ['new_request', 'reviewed', 'confirmed', 'assigned', 'accepted'].includes(b.status)
                const getRescheduleNotice = (st) => {
                  if (['completed', 'closed', 'verified', 'feedback_pending', 'feedback_received'].includes(st)) {
                    return "Reschedule is unavailable because this service has already been completed."
                  }
                  if (['in_progress', 'on_the_way'].includes(st)) {
                    return "Reschedule is unavailable because service is currently in progress."
                  }
                  if (st === 'waiting_for_payment') {
                    return "Reschedule is unavailable while payment is pending."
                  }
                  if (['cancelled', 'rejected'].includes(st)) {
                    return "Reschedule is unavailable for cancelled/rejected bookings."
                  }
                  return null
                }
                const noticeMsg = getRescheduleNotice(b.status)

                return (
                  <React.Fragment key={b.id}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', position: 'relative', zIndex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{(b.service_category_display || b.issue_title || 'Service Booking').replace(/•“/g, ' - ').replace(/•”/g, ' - ').replace(/&amp;/g, '&')}</span>
                          <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 99, fontWeight: 800, background: '#05966915', color: '#059669', border: '1px solid #05966930' }}>{b.status_display || b.status}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Calendar size={13} /> {b.preferred_date || 'N/A'} &nbsp;•&nbsp; <span style={{ fontFamily: 'monospace' }}>{b.request_id}</span></div>

                        {/* Reschedule Action for Eligible Bookings (Pending Confirmation, Confirmed, Employee Assigned) */}
                        {isRescheduleEligible && (
                          <div style={{ marginTop: 6 }}>
                            <button
                              onClick={() => {
                                setRescheduleBookingId(b.id)
                                if (b.preferred_date) setRescheduleDate(b.preferred_date)
                                setShowRescheduleForm(true)
                                if (typeof onChangeTab === 'function') onChangeTab('My Reschedules')
                              }}
                              style={{ padding: '6px 14px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(5,150,105,0.3)' }}
                              onMouseOver={e => e.currentTarget.style.background = '#047857'}
                              onMouseOut={e => e.currentTarget.style.background = '#059669'}
                            >
                              <RefreshCw size={13} /> Reschedule
                            </button>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: ['paid', 'collected'].includes(b.payment_status) ? '#059669' : '#d97706', marginBottom: 12, fontSize: '1.05rem' }}>
                          {b.payment_status_display || (b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'collected' ? 'Collected' : 'Pending')}
                        </div>
                        <button
                          onClick={() => setSelectedMockBooking(selectedMockBooking?.id === b.id ? null : b)}
                          style={{ fontSize: '0.85rem', padding: '8px 18px', borderRadius: 8, border: 'none', background: '#059669', fontWeight: 700, cursor: 'pointer', color: 'white', boxShadow: '0 2px 4px rgba(5,150,105,0.25)', transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#047857'}
                          onMouseOut={e => e.currentTarget.style.background = '#059669'}
                        >
                          {selectedMockBooking?.id === b.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>

                    {selectedMockBooking?.id === b.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '1.5rem', marginTop: '-16px', position: 'relative', zIndex: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>📋 Full Booking Overview</div>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 800, color: '#059669', background: '#05966910', padding: '4px 10px', borderRadius: 8 }}>{b.request_id}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.85rem' }}>
                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Assigned Technician</div>
                            <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                              👤 {b.assigned_employee ? (b.assigned_employee.full_name || b.assigned_employee.user?.first_name || 'Assigned Technician') : 'Not assigned yet'}
                            </div>
                            {b.assigned_employee?.phone && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>📞 {b.assigned_employee.phone}</div>
                            )}
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Scheduled Date & Time</div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              📅 {b.preferred_date || 'Not scheduled'} {b.preferred_time ? `(${b.preferred_time})` : ''}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Payment Details</div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {b.payment_status_display || (b.payment_status === 'paid' ? 'Paid' : 'Pending')} · {b.payment_method_display || (b.payment_method === 'COD' ? 'Cash on Service' : 'Online Payment')}
                            </div>
                            {b.total_amount && (
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>Total: ₹{parseFloat(b.total_amount).toLocaleString('en-IN')}</div>
                            )}
                          </div>

                          <div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Customer Info</div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.customer_name || user?.first_name || 'Customer'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>✉️ {b.email || user?.email} {b.phone ? `· 📞 ${b.phone}` : ''}</div>
                          </div>

                          <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Service Address</div>
                            <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>📍 {b.address || 'N/A'}</div>
                          </div>

                          {b.description && (
                            <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Service Notes</div>
                              <div style={{ fontWeight: 500, color: '#334155', background: 'white', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>{b.description}</div>
                            </div>
                          )}

                          {(() => {
                            let parsedCart = [];
                            if (typeof b.cart_data === 'string') {
                              try { parsedCart = JSON.parse(b.cart_data); } catch (e) { }
                            } else if (Array.isArray(b.cart_data)) {
                              parsedCart = b.cart_data;
                            }

                            if (!parsedCart || parsedCart.length === 0) return null;

                            return (
                              <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
                                  📦 Booked Service Modules ({parsedCart.length})
                                </div>
                                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                    <thead>
                                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 12px', fontWeight: 700 }}>Service Module / Item</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Price</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {parsedCart.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: idx < parsedCart.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                          <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: 600 }}>
                                            {item.name || item.title || item.service_name || item.tier || 'Service Item'}
                                            {item.categoryName && <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{item.categoryName}</div>}
                                            {item.route && <div style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 500 }}>Route: {item.route}</div>}
                                          </td>
                                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>
                                            {item.quantity || 1}
                                          </td>
                                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 800 }}>
                                            ₹{(parseFloat(item.price || item.estimated_price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )
                          })()}

                          <div style={{ gridColumn: '1/-1', borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {(b.available_actions || []).map(act => {
                              if (act === "retry_payment") return (
                                <button key={act} onClick={async () => {
                                  try {
                                    const res = await apiRequest(`/booking/${b.id}/retry-payment/`, {
                                      method: 'POST',
                                      body: JSON.stringify({ payment_method: b.payment_method || 'ONLINE' })
                                    })
                                    if (res.success) {
                                      alert("Payment completed successfully!")
                                      const updated = await apiRequest("/booking/my-bookings/")
                                      if (updated.data) setBookings(updated.data)
                                    } else {
                                      alert(res.message || "Payment retry failed.")
                                    }
                                  } catch (e) { alert(e.message || "Retry payment failed.") }
                                }} style={{ flex: 1, minWidth: 140, padding: '9px 14px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <RefreshCw size={14} /> Retry Payment
                                </button>
                              )
                              if (act === "track") return (
                                <button key={act} onClick={() => { setAssignedTech(b.assigned_employee); onClose(); setStep(0); }} style={{ flex: 1, minWidth: 140, padding: '9px 14px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <MapPin size={14} /> Track Professional
                                </button>
                              )
                              if (act === "reschedule") return (
                                <button key={act} onClick={() => { setActiveTab("My Reschedules"); setSelectedBooking(b); setShowRescheduleForm(true); }} style={{ flex: 1, minWidth: 140, padding: '9px 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <Calendar size={14} /> Reschedule
                                </button>
                              )
                              if (act === "view_invoice") return (
                                <button key={act} onClick={() => window.open(`${API_BASE_URL}/booking/${b.id}/invoice/`, '_blank')} style={{ flex: 1, minWidth: 140, padding: '9px 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <FileText size={14} /> Download Invoice
                                </button>
                              )
                              if (act === "refund_status") return (
                                <button key={act} onClick={() => { setActiveTab("My Refunds"); setSelectedBooking(b); setShowRefundForm(true); }} style={{ flex: 1, minWidth: 140, padding: '9px 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <CreditCard size={14} /> Refund Status
                                </button>
                              )
                              if (act === "report_problem") return (
                                <button key={act} onClick={() => { setActiveTab("My Complaints"); setSelectedBooking(b); setShowComplaintForm(true); }} style={{ flex: 1, minWidth: 140, padding: '9px 14px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <MessageSquare size={14} /> Report Problem
                                </button>
                              )
                              return null
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </motion.div>
        )
      case "Saved Addresses":
        const handleOpenForm = (addr = null) => {
          setAddrError('')
          setAddrSuccess('')
          if (addr) {
            setEditingAddress(addr)
            setAddrLabel(addr.label || 'home')
            setAddrLine1(addr.address_line1 || '')
            setAddrLine2(addr.address_line2 || '')
            setAddrCity(addr.city || '')
            setAddrState(addr.state || '')
            setAddrPincode(addr.pincode || '')
            setAddrPhone(addr.phone_number || '')
            setAddrIsDefault(!!addr.is_default)
          } else {
            setEditingAddress(null)
            setAddrLabel('home')
            setAddrLine1('')
            setAddrLine2('')
            setAddrCity('')
            setAddrState('')
            setAddrPincode('')
            setAddrPhone(user?.phone || '')
            setAddrIsDefault(savedAddresses.length === 0)
          }
          setShowAddressForm(true)
        }

        const handleSaveAddress = async () => {
          setAddrError('')
          setAddrSuccess('')
          if (!addrLine1.trim() || !addrCity.trim() || !addrState.trim() || !addrPincode.trim()) {
            setAddrError('Street Address, City, State, and Pincode are required.')
            return
          }

          setAddrSubmitting(true)
          const payload = {
            label: addrLabel,
            address_line1: addrLine1,
            address_line2: addrLine2,
            city: addrCity,
            state: addrState,
            pincode: addrPincode,
            phone_number: addrPhone,
            is_default: addrIsDefault,
          }

          try {
            const url = editingAddress
              ? `/auth/customer/addresses/${editingAddress.id}/`
              : '/auth/customer/addresses/'
            const method = editingAddress ? 'PATCH' : 'POST'
            const res = await apiRequest(url, { method, json: payload })

            if (res.success) {
              setAddrSuccess(editingAddress ? 'Address updated successfully!' : 'New address saved!')
              setShowAddressForm(false)
              fetchAddresses()
            } else {
              setAddrError(res.message || 'Failed to save address.')
            }
          } catch (e) {
            setAddrError(e?.body?.message || e?.message || 'Failed to save address.')
          } finally {
            setAddrSubmitting(false)
          }
        }

        const handleSetDefault = async (addrId) => {
          setAddrError('')
          setAddrSuccess('')
          try {
            const res = await apiRequest(`/auth/customer/addresses/${addrId}/set-default/`, { method: 'POST', json: {} })
            if (res.success) {
              setAddrSuccess('Default address updated!')
              fetchAddresses()
            } else {
              setAddrError(res.message || 'Failed to set default address.')
            }
          } catch (e) {
            setAddrError(e?.body?.message || e?.message || 'Failed to set default address.')
          }
        }

        const handleDelete = async (addrId) => {
          setAddrError('')
          setAddrSuccess('')
          try {
            const res = await apiRequest(`/auth/customer/addresses/${addrId}/`, { method: 'DELETE' })
            if (!res || res.success || res.status === 204 || res.status === 200) {
              setAddrSuccess('Address deleted successfully.')
              setAddrError('')
            } else {
              const msg = res?.error?.detail || res?.detail || res?.message || 'Failed to delete address.'
              setAddrError(msg)
            }
          } catch (e) {
            setAddrError(e?.body?.detail || e?.message || 'Failed to delete address.')
          } finally {
            fetchAddresses()
          }
        }

        const handleUseForBooking = async (addr) => {
          try {
            await apiRequest(`/auth/customer/addresses/${addr.id}/mark-used/`, { method: 'POST', json: {} })
          } catch (e) {
            console.error(e)
          }
          const fullAddr = `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}, ${addr.city}, ${addr.state} ${addr.pincode}`
          if (typeof setAddress === 'function') setAddress(fullAddr)
          setAddrSuccess(`Selected "${addr.label_display || addr.label}" for booking!`)
          setActiveTab('Book Service')
        }

        const labelIcons = {
          home: '🏠',
          work: '💼',
          other: '📍',
        }

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>Saved Addresses</h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>Manage your home, office, and preferred service delivery locations.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={handleDetectLocationForAddress} disabled={geoAddressLoading}
                  style={{ padding: '10px 16px', background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Compass size={16} /> {geoAddressLoading ? "Detecting..." : "Use Current Location"}
                </button>
                <button onClick={() => handleOpenForm(null)}
                  style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}>
                  <MapPin size={15} /> Add New Address
                </button>
              </div>
            </div>

            {addrSuccess && (
              <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700, marginBottom: 18 }}>
                ✓ {addrSuccess}
              </div>
            )}

            {addrError && (
              <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700, marginBottom: 18 }}>
                ⚠️ {addrError}
              </div>
            )}

            {showAddressForm ? (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{ border: '1.5px solid #05966930', borderRadius: 20, padding: '1.75rem', background: '#f0fdf4', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(5,150,105,0.08)' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 18, color: '#0f172a' }}>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </div>

                <button
                  type="button"
                  onClick={handleDetectLocationForAddress}
                  disabled={geoAddressLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: '0.83rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 18,
                    boxShadow: '0 4px 14px rgba(5,150,105,0.25)'
                  }}
                >
                  <Compass size={17} color="white" /> {geoAddressLoading ? "Detecting Location..." : "📍 Autofill with Current Location (GPS)"}
                </button>

                {addrAccuracy && (
                  <div style={{
                    background: addrAccuracy.rating === 'low' ? '#fef2f2' : addrAccuracy.rating === 'high' ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${addrAccuracy.rating === 'low' ? '#fecaca' : addrAccuracy.rating === 'high' ? '#bbf7d0' : '#fef08a'}`,
                    borderRadius: 12,
                    padding: '10px 14px',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Compass size={18} style={{ color: addrAccuracy.rating === 'low' ? '#dc2626' : addrAccuracy.rating === 'high' ? '#16a34a' : '#d97706' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                          📍 Live GPS Location Detected
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#475569', fontWeight: 500 }}>
                          {addrAccuracy.rating === 'low' ? 'Accuracy is low. Please review before confirming.' : 'Please add Flat/House No. if needed and click Confirm & Save.'}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 99,
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      background: addrAccuracy.rating === 'low' ? '#fee2e2' : addrAccuracy.rating === 'high' ? '#dcfce7' : '#fef3c7',
                      color: addrAccuracy.rating === 'low' ? '#991b1b' : addrAccuracy.rating === 'high' ? '#166534' : '#92400e'
                    }}>
                      ~{addrAccuracy.meters}m
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Address Label Pills */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Address Type
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { code: 'home', title: 'Home', icon: '🏠' },
                        { code: 'work', title: 'Work', icon: '💼' },
                        { code: 'other', title: 'Other', icon: '📍' },
                      ].map(type => (
                        <button key={type.code} type="button" onClick={() => setAddrLabel(type.code)}
                          style={{
                            padding: '10px 18px',
                            borderRadius: 12,
                            border: addrLabel === type.code ? '2px solid #059669' : '1px solid #cbd5e1',
                            background: addrLabel === type.code ? '#ecfdf5' : 'white',
                            color: addrLabel === type.code ? '#059669' : '#475569',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                          <span>{type.icon}</span> {type.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Street Lines */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Street Address (Line 1) *
                    </label>
                    <input value={addrLine1} onChange={e => setAddrLine1(e.target.value)} type="text" placeholder="e.g. 123 Main Street, Apt 4B"
                      style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', background: 'white' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Landmark / Suite (Line 2)
                    </label>
                    <input value={addrLine2} onChange={e => setAddrLine2(e.target.value)} type="text" placeholder="e.g. Near Central Park Tower"
                      style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', background: 'white' }} />
                  </div>

                  {/* City, State, Pincode */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase' }}>City *</label>
                      <input value={addrCity} onChange={e => setAddrCity(e.target.value)} type="text" placeholder="Bengaluru"
                        style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', background: 'white' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase' }}>State *</label>
                      <input value={addrState} onChange={e => setAddrState(e.target.value)} type="text" placeholder="Karnataka"
                        style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', background: 'white' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase' }}>Pincode *</label>
                      <input value={addrPincode} onChange={e => setAddrPincode(e.target.value)} type="text" placeholder="560102"
                        style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', background: 'white' }} />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Contact Phone Number
                    </label>
                    <input value={addrPhone} onChange={e => setAddrPhone(e.target.value)} type="text" placeholder="+91 98765 43210"
                      style={{ width: '100%', padding: '0.75rem 0.9rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', background: 'white' }} />
                  </div>

                  {/* Set Default Toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', marginTop: 4 }}>
                    <input type="checkbox" checked={addrIsDefault} onChange={e => setAddrIsDefault(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#059669' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Set as Default Address for Bookings</span>
                  </label>

                  {/* Submit & Cancel */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button onClick={handleSaveAddress} disabled={addrSubmitting}
                      style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', opacity: addrSubmitting ? 0.7 : 1 }}>
                      {addrSubmitting ? 'Saving...' : (editingAddress ? 'Save Changes' : 'Save Address')}
                    </button>
                    <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }}
                      style={{ padding: '10px 18px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: '#475569' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div>
                {addressesLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.88rem' }}>Loading saved addresses...</div>
                ) : savedAddresses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#f8fafc', borderRadius: 18, border: '1px solid #e2e8f0' }}>
                    <MapPin size={36} style={{ marginBottom: 12, color: '#cbd5e1' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>No saved addresses found.</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>Add your home or office location for 1-click booking.</div>
                    <button onClick={() => handleOpenForm(null)}
                      style={{ marginTop: 16, padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                      + Add Your First Address
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
                    {savedAddresses.map(addr => {
                      const icon = labelIcons[addr.label] || '📍'
                      return (
                        <div key={addr.id}
                          style={{
                            border: addr.is_default ? '2px solid #059669' : '1px solid #e2e8f0',
                            borderRadius: 18,
                            padding: '1.35rem 1.4rem',
                            background: '#ffffff',
                            boxShadow: addr.is_default ? '0 8px 24px rgba(99,102,241,0.12)' : '0 2px 10px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative'
                          }}>

                          <div>
                            {/* Card Header: Icon, Label, Default Badge */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem' }}>
                                  {icon}
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', textTransform: 'capitalize' }}>
                                  {addr.label_display || addr.label}
                                </span>
                              </div>
                              {addr.is_default && (
                                <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: 99, fontWeight: 800, background: '#059669', color: 'white' }}>
                                  Default
                                </span>
                              )}
                            </div>

                            {/* Address Lines */}
                            <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 600, lineHeight: 1.5, marginBottom: 12 }}>
                              <div style={{ color: '#0f172a', fontWeight: 700 }}>{addr.address_line1}</div>
                              {addr.address_line2 && <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{addr.address_line2}</div>}
                              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 3, fontWeight: 500 }}>
                                {addr.city}, {addr.state} - <strong style={{ color: '#334155' }}>{addr.pincode}</strong>
                              </div>
                            </div>

                            {/* Phone & Serviceable strip */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.78rem', color: '#64748b', paddingTop: 10, borderTop: '1px solid #f1f5f9', marginBottom: 12, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span>📞</span> <strong style={{ color: '#334155', fontWeight: 700 }}>{addr.phone_number || user?.phone || 'No phone'}</strong>
                              </div>
                              <div>
                                {addr.serviceable ? (
                                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, fontWeight: 800, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    ✓ Service Available
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, fontWeight: 800, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    ✕ {addr.serviceability_reason || 'Not Serviceable'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Row */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button onClick={() => handleUseForBooking(addr)}
                              style={{ width: '100%', padding: '9px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}>
                              Use for Booking
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, paddingTop: 4 }}>
                              <button onClick={() => setMapAddress(addr)}
                                style={{ padding: '5px 8px', background: 'transparent', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#6366f1' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}>
                                🗺️ Map Pin
                              </button>

                              <button onClick={() => handleOpenForm(addr)}
                                style={{ padding: '5px 8px', background: 'transparent', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#6366f1' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}>
                                ✏️ Edit
                              </button>

                              {!addr.is_default ? (
                                <button onClick={() => handleSetDefault(addr.id)}
                                  style={{ padding: '7px 4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', color: '#059669', textAlign: 'center' }}>
                                  ⭐ Default
                                </button>
                              ) : null}

                              <button onClick={() => handleDelete(addr.id)}
                                style={{ padding: '5px 8px', background: 'transparent', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}
                                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                🗑️ Delete
                              </button>
                            </div>
                          </div>

                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View Map Modal / Draggable Pin Adjustment Modal */}
            {mapAddress && (
              <LocationPickerModal
                initialLocation={`${mapAddress.address_line1}, ${mapAddress.city}`}
                initialCoords={mapAddress.latitude && mapAddress.longitude ? { lat: parseFloat(mapAddress.latitude), lng: parseFloat(mapAddress.longitude) } : null}
                onClose={() => setMapAddress(null)}
                onConfirm={async (confirmedPayload) => {
                  setMapAddress(null)
                  if (!confirmedPayload) return

                  const line1 = confirmedPayload.area ? [confirmedPayload.area, confirmedPayload.formatted_address?.split(',')[0]].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') : (confirmedPayload.formatted_address || mapAddress.address_line1)
                  const city = confirmedPayload.city || mapAddress.city || "Hosur"
                  const state = confirmedPayload.state || mapAddress.state || "Tamil Nadu"
                  const pincode = confirmedPayload.pincode || mapAddress.pincode || "635109"

                  try {
                    const saveRes = await apiRequest(`/auth/customer/addresses/${mapAddress.id}/`, {
                      method: 'PATCH',
                      json: {
                        address_line1: line1,
                        city: city,
                        state: state,
                        pincode: pincode,
                        latitude: confirmedPayload.latitude || mapAddress.latitude,
                        longitude: confirmedPayload.longitude || mapAddress.longitude
                      }
                    })
                    if (saveRes.success || saveRes.data || saveRes.id) {
                      setAddrSuccess('Address pin location updated!')
                      fetchAddresses()
                    }
                  } catch (e) {
                    console.error("Failed to update address location:", e)
                  }
                }}
              />
            )}
          </motion.div>
        )
      case "Payment Methods":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Payment Methods</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* COD Info */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px',
                background: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                gap: 16,
                alignItems: 'center'
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#10B98115', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>ðŸ’µ</div>
                <div>
                  <h4 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>Cash on Service (COD)</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Pay securely in cash directly to our service professional after the job is successfully completed.
                  </p>
                </div>
              </div>

              {/* UPI Info */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                padding: '20px',
                background: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                gap: 16,
                alignItems: 'center'
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#7C3AED15', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>📱</div>
                <div>
                  <h4 style={{ margin: '0 0 4px', color: '#0f172a', fontSize: '1rem', fontWeight: 800 }}>UPI Payments</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Pay instantly online via Google Pay, PhonePe, Paytm, or BHIM during the checkout process.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )
      case "Notifications":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Notifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#7C3AED', marginTop: 6 }} />
                <div style={{ flex: 1, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Booking Confirmed</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 6, lineHeight: 1.5 }}>Your AC Servicing booking for Aug 15 is confirmed. Our expert will arrive on time.</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8, fontWeight: 600 }}>2 days ago</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#cbd5e1', marginTop: 6 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>Promo Code Applied</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 6, lineHeight: 1.5 }}>You successfully saved {BOOKING_CURRENCY_SYMBOL}100 on your last Deep Cleaning booking!</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8, fontWeight: 600 }}>1 week ago</div>
                </div>
              </div>
            </div>
          </motion.div>
        )
      case "Help & Support":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Help & Support</h3>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, background: 'linear-gradient(to right bottom, #f8fafc, #f1f5f9)' }}>
              <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>Need assistance?</h4>
              <p style={{ margin: '0 0 24px', color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>Our dedicated support team is available 24/7 to help you with your bookings, payments, and general queries.</p>
              <button style={{ padding: '0.85rem 1.75rem', background: '#0f172a', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>Contact Support</button>
            </div>
            <h4 style={{ margin: '32px 0 16px', color: '#0f172a', fontSize: '1.1rem', fontWeight: 800 }}>Frequently Asked Questions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {["How to cancel a booking?", "What is the 30-day guarantee?", "How to change my address?", "Are the professionals background checked?"].map((q, i) => (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'white', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{q}</span>
                  <ChevronDown size={18} color="#94a3b8" />
                </div>
              ))}
            </div>
          </motion.div>
        )
      case "My Reschedules":
        const selectedBooking = activeBookings.find(b => String(b.id) === String(rescheduleBookingId)) || activeBookings[0]
        const slotDefinitions = [
          { code: '09-10', label: '09:00 AM - 10:00 AM' },
          { code: '10-11', label: '10:00 AM - 11:00 AM' },
          { code: '11-12', label: '11:00 AM - 12:00 PM' },
          { code: '14-15', label: '02:00 PM - 03:00 PM' },
          { code: '15-16', label: '03:00 PM - 04:00 PM' },
        ]

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My Reschedule Requests</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Request and track schedule modifications for your active service bookings.</p>
              </div>
              <button onClick={() => {
                setShowRescheduleForm(!showRescheduleForm);
                setRescheduleError('');
                setRescheduleSuccess('');
                if (activeBookings.length > 0 && !rescheduleBookingId) {
                  setRescheduleBookingId(activeBookings[0].id)
                }
              }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
                <RefreshCw size={15} /> {showRescheduleForm ? 'Close Form' : 'New Request'}
              </button>
            </div>

            {rescheduleSuccess && (
              <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✓ {rescheduleSuccess}
              </div>
            )}

            {showRescheduleForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                style={{ border: '1.5px solid #7C3AED30', borderRadius: 20, padding: '1.75rem', background: '#faf5ff', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(124,58,237,0.08)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>New Reschedule Request</h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: '#7C3AED15', color: '#7C3AED' }}>Guided Workflow</span>
                </div>

                {rescheduleError && (
                  <div style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 12, fontSize: '0.83rem', fontWeight: 600, marginBottom: 16 }}>
                    ⚠️ {rescheduleError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* 1. Select Booking */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      1. Select Booking to Reschedule
                    </label>
                    {activeBookings.length === 0 ? (
                      <div style={{ padding: '1rem', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        No active bookings eligible for rescheduling found.
                      </div>
                    ) : (
                      <select value={rescheduleBookingId} onChange={e => setRescheduleBookingId(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, background: 'white', outline: 'none' }}>
                        {activeBookings.map(b => {
                          const rawTitle = b.issue_title || b.service_category || 'Service Booking'
                          const cleanTitle = rawTitle.replace(/•“/g, ' - ').replace(/•”/g, ' - ').replace(/&amp;/g, '&')
                          return (
                            <option key={b.id} value={b.id}>
                              {cleanTitle} ({b.request_id || `SR-${b.id}`}) — Current: {b.preferred_date || b.created_at?.split('T')[0]}
                            </option>
                          )
                        })}
                      </select>
                    )}
                  </div>

                  {/* 2. Current Schedule & Booked Submodules Read-Only Display */}
                  {selectedBooking && (
                    <div style={{ background: 'white', borderRadius: 14, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>Current Schedule</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            📅 {selectedBooking.preferred_date || 'Not set'} | ⏰ {selectedBooking.preferred_time || '09-10 (Morning)'}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 99, background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                          Active Snapshot
                        </span>
                      </div>
                      {renderBookedSubmodulesSummary(selectedBooking)}
                    </div>
                  )}

                  {/* 3. New Date & Time Slot */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        2. New Preferred Date
                      </label>
                      <input value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} type="date" min={new Date().toISOString().split('T')[0]}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, background: 'white' }} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Reason for Rescheduling
                      </label>
                      <select value={rescheduleReason} onChange={e => setRescheduleReason(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, background: 'white' }}>
                        <option value="schedule_conflict">Schedule Conflict</option>
                        <option value="emergency">Personal Emergency</option>
                        <option value="weather_delay">Weather Delay</option>
                        <option value="technical_issue">Technical Issue</option>
                        <option value="customer_request">Customer Preference</option>
                        <option value="other">Other Reason</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. Available Time Slots Grid */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      3. Select Available Time Slot {slotsLoading && <span style={{ color: '#7C3AED', fontWeight: 600 }}>(Checking technician availability...)</span>}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                      {slotDefinitions.map(slot => {
                        const availInfo = availableSlots.find(s => s.time_slot === slot.code)
                        const isAvailable = availInfo ? availInfo.is_available : true
                        const isSelected = rescheduleTimeSlot === slot.code

                        return (
                          <button key={slot.code} type="button" disabled={!isAvailable} onClick={() => setRescheduleTimeSlot(slot.code)}
                            style={{
                              padding: '12px',
                              borderRadius: 12,
                              border: isSelected ? '2px solid #7C3AED' : '1px solid #e2e8f0',
                              background: isSelected ? '#f3e8ff' : isAvailable ? 'white' : '#f8fafc',
                              color: isSelected ? '#7C3AED' : isAvailable ? '#0f172a' : '#94a3b8',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: isAvailable ? 'pointer' : 'not-allowed',
                              textAlign: 'left',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                              opacity: isAvailable ? 1 : 0.6,
                              transition: 'all 0.15s ease'
                            }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{slot.label}</span>
                              {isSelected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7C3AED' }} />}
                            </div>
                            <span style={{ fontSize: '0.7rem', color: isAvailable ? (isSelected ? '#7C3AED' : '#10B981') : '#ef4444', fontWeight: 800 }}>
                              {isAvailable ? '✓ Available' : '✕ Fully Booked'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 5. Additional Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Additional Notes (Optional)
                    </label>
                    <textarea value={rescheduleNotes} onChange={e => setRescheduleNotes(e.target.value)} rows={2}
                      placeholder="Add any additional details for the admin or technician..."
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', resize: 'none', background: 'white' }} />
                  </div>

                  {/* 6. Reschedule Policy Checklist */}
                  <div style={{ background: '#f8fafc', borderRadius: 14, padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                      ⚡ CalTrack Reschedule Policy
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: '#64748b' }}>
                      <div>✓ Free reschedule when requested at least 12 hours prior to start time</div>
                      <div>✓ Real-time technician availability checking & scoring algorithm</div>
                      <div>✓ Automatic booking update once confirmed by technician/admin</div>
                    </div>
                  </div>

                  {/* 7. Reactive Summary Block */}
                  <div style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: 'white', borderRadius: 16, padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', fontWeight: 800, marginBottom: 10 }}>
                      Schedule Summary Preview
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', fontSize: '0.88rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Old Schedule</div>
                        <div style={{ fontWeight: 700, marginTop: 2 }}>{selectedBooking?.preferred_date || 'N/A'} ({selectedBooking?.preferred_time || '09-10'})</div>
                      </div>
                      <div style={{ fontSize: '1.2rem', color: '#a855f7', fontWeight: 900 }}>➔</div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 800 }}>New Schedule</div>
                        <div style={{ fontWeight: 800, color: '#4ade80', marginTop: 2 }}>{rescheduleDate || 'Select Date'} ({rescheduleTimeSlot})</div>
                      </div>
                    </div>
                  </div>

                  {/* 8. Submit & Cancel Action Buttons */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                    <button onClick={handleSubmitReschedule} disabled={rescheduleSubmitting || !rescheduleBookingId || !rescheduleDate || !rescheduleTimeSlot}
                      style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', opacity: (rescheduleSubmitting || !rescheduleBookingId || !rescheduleDate || !rescheduleTimeSlot) ? 0.6 : 1, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                      {rescheduleSubmitting ? 'Submitting...' : 'Submit Reschedule Request'}
                    </button>
                    <button onClick={() => setShowRescheduleForm(false)}
                      style={{ padding: '12px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: '#475569' }}>
                      Cancel
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

            {/* List of Requests */}
            {reschedulesLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading reschedule requests...</div>
            ) : reschedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                <RefreshCw size={40} style={{ marginBottom: 14, color: '#cbd5e1' }} />
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>No reschedule requests yet.</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Click "New Request" above to request a schedule change for your active bookings.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reschedules.map(r => {
                  const statusConfig = {
                    PENDING: { bg: '#FEF3C7', color: '#D97706', label: 'Pending Admin Review' },
                    ADMIN_REVIEW: { bg: '#E0E7FF', color: '#4F46E5', label: 'Under Admin Review' },
                    SLOT_SUGGESTED: { bg: '#F5F3FF', color: '#7C3AED', label: 'Admin Suggested New Slot' },
                    AWAITING_EMPLOYEE_RESPONSE: { bg: '#EFF6FF', color: '#2563EB', label: 'Awaiting Technician Confirmation' },
                    REASSIGNMENT_NEEDED: { bg: '#FFF7ED', color: '#C2410C', label: 'Finding Another Technician' },
                    RESCHEDULED: { bg: '#D1FAE5', color: '#059669', label: '✓ Rescheduled Successfully' },
                    REJECTED: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected' },
                    CANCELLED: { bg: '#F1F5F9', color: '#64748B', label: 'Cancelled' },
                    APPROVED: { bg: '#D1FAE5', color: '#059669', label: 'Approved' },
                    CUSTOMER_NOTIFIED: { bg: '#D1FAE5', color: '#059669', label: 'Confirmed & Updated' },
                    TECHNICIAN_CONFIRMATION: { bg: '#F3E8FF', color: '#7C3AED', label: 'Awaiting Tech Confirmation' },
                  }
                  const sc = statusConfig[r.status] || { bg: '#F1F5F9', color: '#64748B', label: r.status_display || r.status }
                  const currentDisplay = r.current_date ? `${r.current_date} (${r.current_time || '09-10'})` : 'N/A'
                  const newDisplay = `${r.new_date} (${r.new_time_slot || '09-10'})`
                  const suggestedDisplay = r.suggested_date ? `${r.suggested_date} (${r.suggested_time_slot || '—'})` : null
                  const isTerminal = ['RESCHEDULED', 'REJECTED', 'CANCELLED'].includes(r.status)

                  return (
                    <div key={r.id} style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '1.35rem', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: 2 }}>
                            {r.issue_title || r.booking_service || 'Service Booking'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                            {r.reschedule_id || `REQ-${r.id}`} · {r.request_id || r.booking_request_id || '—'}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', padding: '6px 12px', borderRadius: 99, fontWeight: 800, background: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </div>

                      {/* Schedule Visualizer */}
                      <div style={{ background: '#0f172a', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.82rem' }}>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Current</div>
                          <div style={{ color: 'white', fontWeight: 700 }}>{currentDisplay}</div>
                        </div>
                        <span style={{ color: '#a855f7', fontWeight: 900, fontSize: '1.1rem' }}>→</span>
                        <div>
                          <div style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Requested</div>
                          <div style={{ color: '#6ee7b7', fontWeight: 700 }}>{newDisplay}</div>
                        </div>
                        {suggestedDisplay && (
                          <>
                            <span style={{ color: '#c084fc', fontWeight: 900 }}>✦</span>
                            <div>
                              <div style={{ fontSize: '0.65rem', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Admin Suggests</div>
                              <div style={{ color: '#e9d5ff', fontWeight: 700 }}>{suggestedDisplay}</div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                        <div><span style={{ fontWeight: 700 }}>Reason:</span> {r.reason}</div>
                        {r.additional_notes && <div><span style={{ fontWeight: 700 }}>Notes:</span> {r.additional_notes}</div>}
                        {r.review_notes && <div style={{ color: '#4f46e5' }}><span style={{ fontWeight: 700 }}>Admin Note:</span> {r.review_notes}</div>}
                        {r.rejection_reason && <div style={{ color: '#dc2626' }}><span style={{ fontWeight: 700 }}>Rejection:</span> {r.rejection_reason_display || r.rejection_reason} {r.rejection_notes && `— ${r.rejection_notes}`}</div>}
                        {r.proposed_technician_name && <div style={{ color: '#2563eb' }}><span style={{ fontWeight: 700 }}>Technician:</span> {r.proposed_technician_name}</div>}
                      </div>

                      {/* 8-Step Dynamic Customer UI Progress Tracker */}
                      {!['REJECTED', 'CANCELLED'].includes(r.status) && (
                        <div style={{ marginTop: 14, marginBottom: 16, padding: '14px 16px', background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Progress Tracker</span>
                            <span style={{ color: '#6366f1' }}>Step {r.step_index || (r.status === 'RESCHEDULED' ? 8 : r.status === 'AWAITING_EMPLOYEE_RESPONSE' ? 6 : 2)} of 8</span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                            {[
                              { num: 1, label: 'Submitted' },
                              { num: 2, label: 'Under Review' },
                              { num: 3, label: 'Admin Approved' },
                              { num: 4, label: 'Assignment' },
                              { num: 5, label: 'Tech Assigned' },
                              { num: 6, label: 'Waiting Tech' },
                              { num: 7, label: 'Updating' },
                              { num: 8, label: 'Rescheduled' },
                            ].map(st => {
                              const stepIdx = r.step_index || (
                                r.status === 'RESCHEDULED' ? 8 :
                                  r.status === 'EMPLOYEE_ACCEPTED' ? 7 :
                                    (r.status === 'AWAITING_EMPLOYEE_RESPONSE' || r.status === 'AWAITING_EMPLOYEE_CONFIRMATION') ? 6 :
                                      (r.status === 'EMPLOYEE_ASSIGNED') ? 5 :
                                        (r.status === 'ADMIN_APPROVED' || r.status === 'REASSIGNMENT_NEEDED') ? 4 :
                                          (r.status === 'ADMIN_REVIEW') ? 2 : 1
                              )
                              const isCompleted = stepIdx > st.num || r.status === 'RESCHEDULED'
                              const isCurrent = stepIdx === st.num && r.status !== 'RESCHEDULED'

                              return (
                                <div key={st.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textCenter: 'center' }}>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 900,
                                    background: isCompleted ? '#10b981' : isCurrent ? '#6366f1' : '#e2e8f0',
                                    color: (isCompleted || isCurrent) ? 'white' : '#94a3b8',
                                    boxShadow: isCurrent ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
                                    transition: 'all 0.2s ease',
                                    marginBottom: 4,
                                  }}>
                                    {isCompleted ? '✓' : st.num}
                                  </div>
                                  <div style={{
                                    fontSize: '0.62rem', fontWeight: isCurrent ? 900 : 700,
                                    color: isCompleted ? '#059669' : isCurrent ? '#4f46e5' : '#94a3b8',
                                    textAlign: 'center', lineHeight: 1.1
                                  }}>
                                    {st.label}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Status-specific info banners */}
                      {r.status === 'AWAITING_EMPLOYEE_RESPONSE' && (
                        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600, marginBottom: 10 }}>
                          🔄 Your request was approved. Waiting for <strong>{r.proposed_technician_name || 'the technician'}</strong> to confirm availability.
                        </div>
                      )}
                      {r.status === 'REASSIGNMENT_NEEDED' && (
                        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#c2410c', fontWeight: 600, marginBottom: 10 }}>
                          ⚙️ The assigned technician was unavailable. Admin is finding a replacement — no action needed from you.
                        </div>
                      )}
                      {r.status === 'RESCHEDULED' && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem', color: '#15803d', fontWeight: 700, marginBottom: 10 }}>
                          ✅ Your booking has been rescheduled to <strong>{newDisplay}</strong>. See you then!
                        </div>
                      )}

                      {/* SLOT_SUGGESTED — Accept / Decline buttons */}
                      {r.status === 'SLOT_SUGGESTED' && suggestedDisplay && (
                        <div style={{ background: '#faf5ff', border: '1.5px solid #d8b4fe', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                          <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: '0.88rem', marginBottom: 8 }}>
                            🗓 Admin suggested a new time slot: <strong>{suggestedDisplay}</strong>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#7c3aed', marginBottom: 12 }}>
                            Accept or decline this suggestion. Accepting will re-enter review with the suggested slot.
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await apiRequest(`/customer/reschedules/${r.id}/respond-suggestion/`, {
                                    method: 'POST', json: { accept: true }
                                  })
                                  if (res?.success) {
                                    const updated = await apiRequest('/customer/reschedules/')
                                    setReschedules(updated.data || [])
                                  }
                                } catch (e) { console.error(e) }
                              }}
                              style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#059669,#10b981)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              ✓ Accept Suggested Slot
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm("Decline this suggested slot? Your request will be marked as rejected.")) return
                                try {
                                  const res = await apiRequest(`/customer/reschedules/${r.id}/respond-suggestion/`, {
                                    method: 'POST', json: { accept: false }
                                  })
                                  if (res?.success) {
                                    const updated = await apiRequest('/customer/reschedules/')
                                    setReschedules(updated.data || [])
                                  }
                                } catch (e) { console.error(e) }
                              }}
                              style={{ padding: '9px 20px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              ✕ Decline Suggestion
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Cancel button — only for PENDING */}
                      {r.status === 'PENDING' && (
                        <button onClick={async () => {
                          try {
                            await apiRequest(`/customer/reschedules/${r.id}/cancel/`, { method: 'POST', json: {} })
                            const updated = await apiRequest('/customer/reschedules/')
                            setReschedules(updated.data || [])
                          } catch (e) {
                            try {
                              await apiRequest(`/booking/reschedule/${r.id}/cancel/`, { method: 'POST', json: {} })
                              const updated = await apiRequest('/booking/reschedule/')
                              setReschedules(updated.data || [])
                            } catch (err) { console.error(err) }
                          }
                        }}
                          style={{ marginTop: 6, padding: '8px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                          Cancel Request
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )

      case "My Refunds":
        const selectedRefundBooking = eligibleRefundBookings.find(b => String(b.id) === String(refundBookingId)) || eligibleRefundBookings[0]
        const refundReasonChoices = [
          { code: 'POOR_QUALITY', label: 'Poor Quality Work' },
          { code: 'SERVICE_NOT_COMPLETED', label: 'Service Not Completed' },
          { code: 'CANCELLED_BY_PROVIDER', label: 'Cancelled By Provider' },
          { code: 'OVERCHARGED', label: 'Overcharged' },
          { code: 'OTHER', label: 'Other Issue' },
        ]

        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My Refund Requests</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Request refunds for completed paid bookings and track resolution timeline.</p>
              </div>
              <button onClick={() => { setShowRefundForm(!showRefundForm); setRefundError(''); setRefundSuccess(''); }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}>
                <CreditCard size={15} /> {showRefundForm ? 'Close Form' : 'Request Refund'}
              </button>
            </div>

            {refundSuccess && (
              <div style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✓ {refundSuccess}
              </div>
            )}

            {showRefundForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
                style={{ border: '1.5px solid #7C3AED30', borderRadius: 20, padding: '1.75rem', background: '#faf5ff', marginBottom: 24, boxShadow: '0 10px 25px -5px rgba(124,58,237,0.08)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>New Refund Request</h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: '#7C3AED15', color: '#7C3AED' }}>Guided Refund Flow</span>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 16px', fontSize: '0.83rem', color: '#92400e', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <div>Refunds are only available for paid completed bookings. The requested amount cannot exceed what was paid.</div>
                </div>

                {refundError && (
                  <div style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 12, fontSize: '0.83rem', fontWeight: 600, marginBottom: 16 }}>
                    ⚠️ {refundError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* 1. Select Booking */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      1. Select Paid Booking
                    </label>
                    {eligibleRefundBookings.length === 0 ? (
                      <div style={{ padding: '1rem', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        No eligible paid bookings available for refund.
                      </div>
                    ) : (
                      <select value={refundBookingId} onChange={e => setRefundBookingId(e.target.value)}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, background: 'white' }}>
                        {eligibleRefundBookings.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.issue_title || b.request_id} — {b.request_id} ({BOOKING_CURRENCY_SYMBOL}{b.estimated_cost || '500'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 2. Booking Refund Summary Card */}
                  {refundSummary && (
                    <div style={{ background: 'white', borderRadius: 16, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, marginBottom: 10 }}>
                        Booking Financial Summary
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Paid Amount</div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginTop: 2 }}>{BOOKING_CURRENCY_SYMBOL}{refundSummary.paid_amount}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Max Refundable</div>
                          <div style={{ fontWeight: 800, color: '#7C3AED', fontSize: '1.05rem', marginTop: 2 }}>{BOOKING_CURRENCY_SYMBOL}{refundSummary.max_refundable_amount}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Status</div>
                          <div style={{ fontWeight: 800, color: refundSummary.eligible ? '#10B981' : '#EF4444', fontSize: '0.85rem', marginTop: 4 }}>
                            {refundSummary.eligible ? '✓ Eligible' : '✕ Ineligible'}
                          </div>
                        </div>
                      </div>
                      {renderBookedSubmodulesSummary(selectedRefundBooking)}
                    </div>
                  )}

                  {/* 3. Refund Type Choice Pills */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      2. Refund Type
                    </label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { code: 'FULL', label: 'Full Refund', desc: '100% of total paid amount' },
                        { code: 'PARTIAL', label: 'Partial Refund', desc: 'Custom specific amount' },
                      ].map(t => {
                        const isSel = refundType === t.code
                        return (
                          <button key={t.code} onClick={() => {
                            setRefundType(t.code)
                            if (t.code === 'FULL' && refundSummary?.paid_amount) {
                              setRefundRequestedAmount(refundSummary.paid_amount)
                            }
                          }}
                            style={{
                              flex: 1, padding: '0.85rem 1rem', borderRadius: 14,
                              border: isSel ? '2px solid #7C3AED' : '1.5px solid #e2e8f0',
                              background: isSel ? 'linear-gradient(135deg,#7C3AED15,#a855f715)' : 'white',
                              cursor: 'pointer', textAlign: 'left',
                            }}>
                            <div style={{ fontWeight: 800, color: isSel ? '#7C3AED' : '#0f172a', fontSize: '0.88rem' }}>{t.label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{t.desc}</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 4. Amount Input (only for partial) */}
                  {refundType === 'PARTIAL' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        3. Refund Amount (₹)
                      </label>
                      <input
                        type="number" min="1" max={refundSummary?.max_refundable_amount}
                        value={refundRequestedAmount} onChange={e => setRefundRequestedAmount(e.target.value)}
                        placeholder={`Max: ₹${refundSummary?.max_refundable_amount || '—'}`}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}
                      />
                    </div>
                  )}

                  {/* 5. Reason */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {refundType === 'PARTIAL' ? '4.' : '3.'} Reason for Refund
                    </label>
                    <select value={refundReason} onChange={e => setRefundReason(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700, background: 'white' }}>
                      <option value="">Select a reason...</option>
                      {refundReasonChoices.map(rc => (
                        <option key={rc.code} value={rc.code}>{rc.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* 6. Additional Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#334155', fontWeight: 800, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Additional Notes <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(optional)</span>
                    </label>
                    <textarea value={refundNotes} onChange={e => setRefundNotes(e.target.value)}
                      rows={3} placeholder="Describe the issue in detail..."
                      style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: 12, border: '1.5px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a', resize: 'none' }} />
                  </div>

                  {/* 7. Submit */}
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <button onClick={handleSubmitRefund}
                      disabled={refundSubmitting || !refundBookingId || !refundReason || (refundType === 'PARTIAL' && !refundRequestedAmount)}
                      style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', opacity: (refundSubmitting || !refundBookingId || !refundReason) ? 0.6 : 1, boxShadow: '0 4px 14px rgba(124,58,237,0.25)' }}>
                      {refundSubmitting ? 'Submitting...' : 'Submit Refund Request'}
                    </button>
                    <button onClick={() => setShowRefundForm(false)}
                      style={{ padding: '12px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: '#475569' }}>
                      Cancel
                    </button>
                  </div>

                </div>
              </motion.div>
            )}

            {refundsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading refund requests...</div>
            ) : refunds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <CreditCard size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 700 }}>No refund requests yet.</div>
                <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Request a refund for any completed paid booking.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {refunds.map(r => {
                  const sc = { REQUESTED: '#F59E0B', UNDER_REVIEW: '#3B82F6', APPROVED: '#8B5CF6', REJECTED: '#EF4444', PROCESSED: '#10B981', FAILED: '#EF4444' }[r.status] || '#64748b'
                  return (
                    <div key={r.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.25rem', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', marginBottom: 4 }}>{r.booking_service || 'Service Booking'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{r.booking_request_id}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#7C3AED', marginBottom: 4 }}>₹{r.amount}</div>
                          <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 99, fontWeight: 800, background: sc + '18', color: sc, border: `1px solid ${sc}30` }}>{r.status}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Reason:</span> {r.reason}</div>
                      {r.admin_notes && <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: 4 }}><span style={{ fontWeight: 700 }}>Admin Notes:</span> {r.admin_notes}</div>}
                      {r.gateway_reference && <div style={{ fontSize: '0.78rem', color: '#64748b' }}><span style={{ fontWeight: 700 }}>Reference:</span> {r.gateway_reference}</div>}
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )

      case "My Complaints":
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {selectedComplaint ? (
              // Complaint thread view
              <div>
                <button onClick={() => setSelectedComplaint(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginBottom: 16 }}>
                  <ChevronLeft size={18} /> Back to Complaints
                </button>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.5rem', background: 'white', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 4 }}>{selectedComplaint.category_display}</div>
                      {selectedComplaint.booking_request_id && <div style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{selectedComplaint.booking_request_id}</div>}
                    </div>
                    {(() => {
                      const sc = { OPEN: '#F59E0B', IN_PROGRESS: '#3B82F6', RESOLVED: '#10B981', ESCALATED: '#EF4444', CLOSED: '#94a3b8' }[selectedComplaint.status] || '#64748b'
                      return <span style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: 99, fontWeight: 800, background: sc + '18', color: sc, border: `1px solid ${sc}30` }}>{selectedComplaint.status_display}</span>
                    })()}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>{selectedComplaint.description}</div>
                </div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', marginBottom: 12 }}>Conversation Thread</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                  {(selectedComplaint.messages || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>No responses yet. Our team will respond within 24 hours.</div>
                  )}
                  {(selectedComplaint.messages || []).map(resp => {
                    const isCustomer = resp.persona === 'CUSTOMER'
                    return (
                      <div key={resp.id} style={{ display: 'flex', justifyContent: isCustomer ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isCustomer ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: isCustomer ? 'linear-gradient(135deg,#7C3AED,#a855f7)' : '#f1f5f9', color: isCustomer ? 'white' : '#0f172a', fontSize: '0.85rem', lineHeight: 1.5 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.7rem', opacity: 0.75, marginBottom: 4 }}>{isCustomer ? 'You' : resp.persona === 'ADMIN' ? 'ðŸ›¡ï¸ Support Team' : 'ðŸ‘· Employee'}</div>
                          {resp.message}
                          <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4 }}>{new Date(resp.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {selectedComplaint.status !== 'CLOSED' && selectedComplaint.status !== 'RESOLVED' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input value={complaintReply} onChange={e => setComplaintReply(e.target.value)} placeholder="Type your reply..." onKeyDown={e => e.key === 'Enter' && handleComplaintReply(selectedComplaint.id)}
                      style={{ flex: 1, padding: '0.8rem 1rem', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#0f172a' }} />
                    <button onClick={() => handleComplaintReply(selectedComplaint.id)} disabled={complaintReplying || !complaintReply.trim()}
                      style={{ padding: '0.8rem 1.2rem', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer', opacity: complaintReplying ? 0.7 : 1 }}>
                      Send
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Complaints list view
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>My Complaints</h3>
                  <button onClick={() => { setShowComplaintForm(true); setComplaintError(''); setComplaintSuccess(''); }}
                    style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={14} /> New Complaint
                  </button>
                </div>

                {complaintSuccess && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px 14px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 700, marginBottom: 16 }}>•œ… {complaintSuccess}</div>}

                {showComplaintForm && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ border: '1.5px solid #7C3AED30', borderRadius: 16, padding: '1.5rem', background: '#faf5ff', marginBottom: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginBottom: 16 }}>File a New Complaint</div>
                    {complaintError && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, marginBottom: 12 }}>{complaintError}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 6 }}>Category</label>
                        <select value={complaintCategory} onChange={e => setComplaintCategory(e.target.value)}
                          style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', background: 'white' }}>
                          <option value="SERVICE_QUALITY">Service Quality</option>
                          <option value="EMPLOYEE_BEHAVIOR">Employee Behavior</option>
                          <option value="BILLING">Billing</option>
                          <option value="SCHEDULING">Scheduling</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 6 }}>Booking ID (optional)</label>
                        <input value={complaintBookingId} onChange={e => setComplaintBookingId(e.target.value)} placeholder="Leave blank for general complaint" type="text"
                          style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', fontWeight: 700, marginBottom: 6 }}>Describe Your Issue</label>
                        <textarea value={complaintDesc} onChange={e => setComplaintDesc(e.target.value)} rows={4} placeholder="Please describe your issue in detail..."
                          style={{ width: '100%', padding: '0.8rem', borderRadius: 10, border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#0f172a', resize: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button onClick={handleSubmitComplaint} disabled={complaintSubmitting || !complaintDesc}
                          style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#7C3AED,#a855f7)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', opacity: complaintSubmitting ? 0.7 : 1 }}>
                          {complaintSubmitting ? 'Submitting...' : 'Submit Complaint'}
                        </button>
                        <button onClick={() => setShowComplaintForm(false)}
                          style={{ padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: '#475569' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {complaintsLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading complaints...</div>
                ) : complaints.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                    <MessageSquare size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontWeight: 700 }}>No complaints filed yet.</div>
                    <div style={{ fontSize: '0.85rem', marginTop: 4 }}>If you have an issue with a service, let us know!</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {complaints.map(c => {
                      const sc = { OPEN: '#F59E0B', IN_PROGRESS: '#3B82F6', RESOLVED: '#10B981', ESCALATED: '#EF4444', CLOSED: '#94a3b8' }[c.status] || '#64748b'
                      return (
                        <div key={c.id} onClick={async () => {
                          const res = await apiRequest(`/booking/complaints/${c.id}/`)
                          setSelectedComplaint(res.data)
                        }}
                          style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: '1.25rem', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer', transition: 'border-color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#7C3AED50'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', marginBottom: 2 }}>{c.category_display}</div>
                              {c.booking_request_id && <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{c.booking_request_id}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.7rem', padding: '3px 9px', borderRadius: 99, fontWeight: 800, background: sc + '18', color: sc, border: `1px solid ${sc}30`, display: 'block', marginBottom: 4 }}>{c.status_display}</span>
                              {c.attachment_count > 0 && <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ðŸ“Ž {c.attachment_count} file{c.attachment_count > 1 ? 's' : ''}</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.description}</div>
                          <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span style={{ color: '#7C3AED', fontWeight: 700 }}>View Thread •†’</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )

      default:
        return null
    }
  }

  if (!user) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 10050, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={onClose}>
        <motion.div
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{ background: 'white', padding: '3rem', borderRadius: 24, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}
        >
          <div onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Welcome Back</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: 32 }}>Log in to view your bookings and manage your profile.</p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button onClick={() => { setLoginMethod('email'); setOtpSent(false); setLoginError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: loginMethod === 'email' ? '2px solid #059669' : '1px solid #e2e8f0', background: loginMethod === 'email' ? '#05966910' : 'white', color: loginMethod === 'email' ? '#059669' : '#64748b' }}>Email</button>
            <button onClick={() => { setLoginMethod('phone'); setOtpSent(false); setLoginError(''); }} style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', border: loginMethod === 'phone' ? '2px solid #059669' : '1px solid #e2e8f0', background: loginMethod === 'phone' ? '#05966910' : 'white', color: loginMethod === 'phone' ? '#059669' : '#64748b' }}>Phone</button>
          </div>

          {loginError && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, marginBottom: 20 }}>{loginError}</div>}

          {!otpSent ? (
            <>
              {loginMethod === 'email' ? (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>Email Address</label>
                  <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a' }} />
                </div>
              ) : (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>Phone Number</label>
                  <input type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1rem', color: '#0f172a' }} />
                </div>
              )}
              <button onClick={handleRequestOTP} disabled={loginLoading} style={{ width: '100%', padding: '14px', background: '#059669', color: 'white', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loginLoading ? 0.7 : 1 }}>
                {loginLoading ? 'Sending...' : 'Send Login Code'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
                <span style={{ padding: '0 10px' }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#cbd5e1' }} />
              </div>

              <button
                type="button"
                onClick={() => googleLoginHandler()}
                disabled={loginLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'white',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  opacity: loginLoading ? 0.7 : 1
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.8 2.17c1.64-1.51 2.59-3.74 2.59-6.5z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.8-2.17c-.78.52-1.78.83-2.8.83-2.34 0-4.32-1.58-5.03-3.7L1.47 13.07C2.95 16 6.01 18 9 18z" />
                  <path fill="#FBBC05" d="M3.97 10.78c-.18-.52-.28-1.09-.28-1.68s.1-1.16.28-1.68L1.47 5.12C.53 7 0 9.08 0 11.2s.53 4.2 1.47 6.08l2.5-1.9c-.71-2.12-.71-4.4 0-6.5z" />
                  <path fill="#EA4335" d="M9 3.58c1.32-.03 2.59.48 3.51 1.4l2.63-2.63C13.48.88 11.3.02 9 0 6.01 0 2.95 2 1.47 4.93l2.5 1.9C4.68 5.16 6.66 3.58 9 3.58z" />
                </svg>
                Continue with Google
              </button>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 8 }}>Enter 6-digit OTP</label>
                <input type="text" value={otpValue} onChange={e => setOtpValue(e.target.value)} placeholder="123456" maxLength={6} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: '1.2rem', letterSpacing: '4px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }} />
              </div>
              <button onClick={handleVerifyOTP} disabled={loginLoading} style={{ width: '100%', padding: '14px', background: '#059669', color: 'white', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loginLoading ? 0.7 : 1 }}>
                {loginLoading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Change {loginMethod === 'email' ? 'Email' : 'Phone'}</button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 10050, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <motion.div
        initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 35, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 960, background: 'white', height: '100%', display: 'flex', boxShadow: '-20px 0 50px rgba(0,0,0,0.15)' }}
      >
        {/* Sidebar */}
        <div style={{ width: 280, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '2.25rem 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #c4b5fd', flexShrink: 0 }}>
              <User size={22} color="#6366f1" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userFullName}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail || userPhone}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4, padding: '0 12px' }}>
            {tabs.map(t => (
              <div
                key={t.id}
                onClick={() => onChangeTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', cursor: 'pointer',
                  background: activeTab === t.id ? 'white' : 'transparent',
                  borderLeft: `4px solid ${activeTab === t.id ? '#059669' : 'transparent'}`,
                  color: activeTab === t.id ? '#059669' : '#475569',
                  fontWeight: activeTab === t.id ? 800 : 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.18s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <t.icon size={20} color={activeTab === t.id ? '#059669' : '#94a3b8'} /> {t.id}
                </div>
                {t.badge > 0 && (
                  <span style={{ background: '#059669', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99 }}>
                    {t.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', padding: '0.75rem 1rem', background: '#fef2f2',
                color: '#ef4444', border: '1px solid #fee2e2', borderRadius: 12,
                fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <div onClick={onClose} style={{ width: 38, height: 38, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
              <X size={18} />
            </div>
          </div>
          <div style={{ maxWidth: 680, width: '100%' }}>
            {renderTabContent()}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   URBAN STYLE "PEOPLE ALSO TAKE" CAROUSEL COMPONENT
   ───────────────────────────────────────────────────────────── */

export function PeopleAlsoTake({ category, cart, setCart }) {
  const sliderRef = useRef(null);

  const peopleAlsoTakeCatalog = useMemo(() => ({
    ac: [
      { id: "pat-ac-1", name: "Anti-Rust Protective Coating", price: 249, rating: "4.8", reviews: "12K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80&fit=crop" },
      { id: "pat-ac-2", name: "AC Gas Leak Audit & Top-Up", price: 499, rating: "4.9", reviews: "24K", optionsText: "3 options", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&q=80&fit=crop" },
      { id: "pat-ac-3", name: "Foam Filter Deep Sanitization", price: 199, rating: "4.8", reviews: "18K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop" },
      { id: "pat-ac-4", name: "Drain Pipe Flushing & De-clog", price: 149, rating: "4.7", reviews: "9K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80&fit=crop" },
      { id: "pat-ac-5", name: "AC Condenser Coil Jet Wash", price: 299, rating: "4.8", reviews: "15K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&q=80&fit=crop" },
      { id: "pat-ac-6", name: "AC Outdoor Unit Bracket Setup", price: 349, rating: "4.7", reviews: "11K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80&fit=crop" }
    ],
    cleaning: [
      { id: "pat-cl-1", name: "Sofa deep cleaning", price: 499, rating: "4.85", reviews: "210K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=500&q=80&fit=crop" },
      { id: "pat-cl-2", name: "Kitchen deep cleaning", price: 999, rating: "4.81", reviews: "140K", optionsText: "3 options", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80&fit=crop" },
      { id: "pat-cl-3", name: "Bathroom deep cleaning", price: 399, rating: "4.88", reviews: "310K", optionsText: null, image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80&fit=crop" },
      { id: "pat-cl-4", name: "Balcony & window cleaning", price: 299, rating: "4.75", reviews: "65K", optionsText: null, image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop" }
    ],
    painting: [
      { id: "pat-pt-1", name: "Wall crack & dampness repair", price: 499, rating: "4.80", reviews: "55K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80&fit=crop" },
      { id: "pat-pt-2", name: "Wood polishing & lacquer", price: 799, rating: "4.77", reviews: "40K", optionsText: "3 options", image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80&fit=crop" },
      { id: "pat-pt-3", name: "Metal grill anti-rust painting", price: 399, rating: "4.74", reviews: "30K", optionsText: null, image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=500&q=80&fit=crop" },
      { id: "pat-pt-4", name: "Texture wall design", price: 1299, rating: "4.89", reviews: "75K", optionsText: "4 options", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500&q=80&fit=crop" }
    ],
    plumbing: [
      { id: "pat-pl-1", name: "Water heater geyser repair", price: 599, rating: "4.76", reviews: "100K", optionsText: "3 options", image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&q=80&fit=crop" },
      { id: "pat-pl-2", name: "Tap & mixer replacement", price: 199, rating: "4.82", reviews: "110K", optionsText: null, image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80&fit=crop" },
      { id: "pat-pl-3", name: "Drain block removal", price: 299, rating: "4.79", reviews: "150K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop" },
      { id: "pat-pl-4", name: "Water tank cleaning", price: 899, rating: "4.84", reviews: "90K", optionsText: null, image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=500&q=80&fit=crop" }
    ],
    general: [
      { id: "pat-gn-1", name: "Anti-Rust Protective Coating", price: 249, rating: "4.8", reviews: "12K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80&fit=crop" },
      { id: "pat-gn-2", name: "AC Gas Leak Audit & Top-Up", price: 499, rating: "4.9", reviews: "24K", optionsText: "3 options", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&q=80&fit=crop" },
      { id: "pat-gn-3", name: "Foam Filter Deep Sanitization", price: 199, rating: "4.8", reviews: "18K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop" },
      { id: "pat-gn-4", name: "Drain Pipe Flushing & De-clog", price: 149, rating: "4.7", reviews: "9K", optionsText: "2 options", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80&fit=crop" }
    ]
  }), []);

  const catKey = useMemo(() => {
    const cartName = (cart && cart[0]?.name) || "";
    const raw = `${category?.name || ""} ${category?.id || ""} ${category?.slug || ""} ${cartName}`.toLowerCase();
    if (raw.includes("ac") || raw.includes("hvac") || raw.includes("foam") || raw.includes("jet") || raw.includes("cooler") || raw.includes("appliance")) return "ac";
    if (raw.includes("clean") || raw.includes("sofa") || raw.includes("kitchen") || raw.includes("bathroom")) return "cleaning";
    if (raw.includes("paint") || raw.includes("waterproof") || raw.includes("texture")) return "painting";
    if (raw.includes("plumb") || raw.includes("pipe") || raw.includes("tap")) return "plumbing";
    return "general";
  }, [category, cart]);

  const [dynamicBackendServices, setDynamicBackendServices] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadServices() {
      try {
        const res = await apiRequest("/catalog/services/");
        if (res && isMounted) {
          const list = Array.isArray(res) ? res : (res.results || []);
          if (list.length > 0) {
            const filtered = list.filter(s => {
              const sCat = (s.category_slug || s.category_id || s.category_name || s.category || "").toString().toLowerCase();
              const sName = (s.name || "").toLowerCase();
              if (catKey === "ac") return sCat.includes("ac") || sCat.includes("hvac") || sName.includes("ac") || sName.includes("foam");
              if (catKey === "cleaning") return sCat.includes("clean") || sName.includes("clean");
              if (catKey === "painting") return sCat.includes("paint") || sName.includes("paint");
              if (catKey === "plumbing") return sCat.includes("plumb") || sName.includes("plumb");
              return true;
            });

            if (filtered.length > 0) {
              const mapped = filtered.map((s, idx) => ({
                id: s.id ? s.id.toString() : `pat-dyn-${idx}`,
                name: s.name,
                price: parseFloat(s.price) || 299,
                rating: s.rating ? s.rating.toString() : "4.8",
                reviews: s.reviews ? s.reviews.toString() : "10K",
                optionsText: "2 options",
                image: s.image || "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80&fit=crop"
              }));
              setDynamicBackendServices(mapped);
            }
          }
        }
      } catch (e) {
        console.log("Using static curated category services", e);
      }
    }
    loadServices();
    return () => { isMounted = false; };
  }, [catKey, category, cart]);

  const itemsList = dynamicBackendServices.length > 0
    ? dynamicBackendServices
    : (peopleAlsoTakeCatalog[catKey] || peopleAlsoTakeCatalog.general);

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  const handleAdd = (item) => {
    setCart(prev => {
      const cur = prev || [];
      const exists = cur.find(i => i.id === item.id);
      if (exists) {
        return cur.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...cur, { id: item.id, name: item.name, price: item.price, quantity: 1, image: item.image }];
    });
  };

  const handleRemove = (itemId) => {
    setCart(prev => {
      if (!prev) return [];
      const exists = prev.find(i => i.id === itemId);
      if (!exists) return prev;
      if (exists.quantity <= 1) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs my-6 relative group">
      <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">People also take</h3>

      {/* Slider Left Arrow */}
      <button
        type="button"
        onClick={scrollLeft}
        aria-label="Previous services"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-all cursor-pointer opacity-90 group-hover:opacity-100"
      >
        <ChevronLeft size={18} strokeWidth={2.5} />
      </button>

      {/* Slider Right Arrow */}
      <button
        type="button"
        onClick={scrollRight}
        aria-label="Next services"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-all cursor-pointer opacity-90 group-hover:opacity-100"
      >
        <ChevronRight size={18} strokeWidth={2.5} />
      </button>

      {/* Horizontal Carousel */}
      <div
        ref={sliderRef}
        className="flex gap-4 overflow-x-auto scrollbar-none pb-2 scroll-smooth px-1"
      >
        {itemsList.map(item => {
          const cartItem = (cart || []).find(i => i.id === item.id);
          const isAdded = !!cartItem && cartItem.quantity > 0;
          return (
            <div
              key={item.id}
              className="w-[200px] sm:w-[220px] shrink-0 flex flex-col justify-between"
            >
              <div>
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 mb-3 shadow-2xs">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                  {item.name}
                </h4>
                <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                  <Star size={13} className="fill-slate-900 text-slate-900" />
                  <span className="font-bold text-slate-900">{item.rating}</span>
                  <span className="text-slate-500 font-medium">({item.reviews})</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Starts at</span>
                  <span className="text-sm font-black text-slate-900">₹{item.price.toLocaleString("en-IN")}</span>
                </div>

                {isAdded ? (
                  <div className="flex items-center gap-2 border border-purple-600 bg-white rounded-xl px-2.5 py-1.5 shadow-2xs text-xs font-black">
                    <button type="button" onClick={() => handleRemove(item.id)} className="text-purple-700 font-extrabold hover:text-purple-900 cursor-pointer px-1">-</button>
                    <span className="text-slate-900 font-black">{cartItem.quantity}</span>
                    <button type="button" onClick={() => handleAdd(item)} className="text-purple-700 font-extrabold hover:text-purple-900 cursor-pointer px-1">+</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => handleAdd(item)}
                      className="px-5 py-1.5 rounded-xl border border-purple-600 bg-white text-purple-700 font-extrabold text-sm hover:bg-purple-50 transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      Add
                    </button>
                    {item.optionsText && (
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">{item.optionsText}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ───────────────────────────────────────────────────────────── */

function QuickCommerceCartCheckout({
  cart,
  setCart,
  category,
  onBack,
  user
}) {
  const [isAddressScreenOpen, setIsAddressScreenOpen] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState([
    {
      id: "addr_home",
      type: "Home",
      address: "Thozhi Hostel Thozhi Hostel, Viswanath Puram, Thillai Nagar, Hosur, Tamil Nadu, India",
      icon: "home"
    },
    {
      id: "addr_work",
      type: "Work",
      address: "golden fairmart, near rto check post Thillai Nagar, Nallur",
      icon: "work"
    }
  ])
  const [selectedAddressId, setSelectedAddressId] = useState("addr_home")
  const [isDonationChecked, setIsDonationChecked] = useState(false)
  const [selectedTip, setSelectedTip] = useState(null)
  const [customTip, setCustomTip] = useState("")
  const [isCustomTipOpen, setIsCustomTipOpen] = useState(false)
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [newAddressText, setNewAddressText] = useState("")
  const [newAddressType, setNewAddressType] = useState("Home")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderConfirmedData, setOrderConfirmedData] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")

  const activeAddressObj = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses[0]

  const itemsTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0)
  const itemsOriginalTotal = cart.reduce((sum, item) => sum + (item.mrp || Math.round((item.price || 0) * 1.2)) * (item.quantity || 1), 0)
  const savings = Math.max(0, itemsOriginalTotal - itemsTotal)
  const deliveryCharge = itemsTotal >= 199 ? 0 : 30
  const handlingCharge = itemsTotal > 0 ? 5 : 0
  const surgeCharge = 15
  const donationAmount = isDonationChecked ? 1 : 0
  const tipAmount = selectedTip === "custom" ? (parseInt(customTip) || 0) : (selectedTip || 0)
  const grandTotal = Math.max(0, itemsTotal + deliveryCharge + handlingCharge + surgeCharge + donationAmount + tipAmount)

  const handleUpdateQty = (id, delta) => {
    setCart(prev => {
      return prev
        .map(it => {
          if (it.id === id) {
            const nextQty = (it.quantity || 1) + delta
            return nextQty > 0 ? { ...it, quantity: nextQty } : null
          }
          return it
        })
        .filter(Boolean)
    })
  }

  const handleAddNewAddress = (e) => {
    e?.preventDefault()
    if (!newAddressText.trim()) return
    const newId = `addr_${Date.now()}`
    const newObj = {
      id: newId,
      type: newAddressType,
      address: newAddressText.trim(),
      icon: newAddressType.toLowerCase() === "work" ? "work" : "home"
    }
    setSavedAddresses(prev => [newObj, ...prev])
    setSelectedAddressId(newId)
    setNewAddressText("")
    setShowAddAddressModal(false)
    setIsAddressScreenOpen(false)
  }

  const handleProceedToPay = async () => {
    if (cart.length === 0) return
    setIsSubmitting(true)
    setErrorMsg("")
    try {
      const today = new Date().toISOString().split("T")[0]
      const payload = {
        customer_name: user?.full_name || user?.fullName || user?.firstName || "Valued Customer",
        phone: user?.phone || "9876543210",
        service_category: "vegetables_quick_delivery",
        issue_title: `Farm-Fresh Vegetables Delivery (${cart.length} items)`,
        description: `Quick Commerce Vegetable Order\nDelivering to: ${activeAddressObj?.address || "Hosur"}`,
        address: activeAddressObj?.address || "Hosur, Tamil Nadu",
        preferred_date: today,
        total_amount: grandTotal,
        payment_method: "COD",
        cart_data: cart.map(c => ({
          name: c.name || c.displayName,
          displayName: c.displayName,
          unit: c.unit,
          price: c.price,
          quantity: c.quantity,
          image: c.image
        }))
      }

      let res = null
      try {
        res = await apiRequest("/booking/", { method: "POST", data: payload })
      } catch (e) {
        // Fallback response for rapid mock checkout
        res = { success: true, request_id: `VEG-HOS-${Math.floor(100000 + Math.random() * 900000)}` }
      }

      setOrderConfirmedData({
        requestId: res?.data?.request_id || res?.request_id || `VEG-HOS-${Math.floor(100000 + Math.random() * 900000)}`,
        address: activeAddressObj?.address,
        total: grandTotal,
        itemsCount: cart.reduce((a, b) => a + (b.quantity || 1), 0),
        eta: "15-20 minutes"
      })
    } catch (err) {
      setErrorMsg(err?.message || "Failed to place order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderConfirmedData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-1">Order Confirmed!</h3>
          <p className="text-xs text-slate-500 font-semibold mb-6">
            Order ID: <span className="text-emerald-700 font-bold">{orderConfirmedData.requestId}</span>
          </p>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-left space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Estimated Delivery:</span>
              <span className="text-emerald-800 font-extrabold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {orderConfirmedData.eta}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Items Count:</span>
              <span className="text-slate-800 font-bold">{orderConfirmedData.itemsCount} items</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Total (Cash on Delivery):</span>
              <span className="text-slate-900 font-black text-sm">₹{orderConfirmedData.total}</span>
            </div>
            <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-slate-600">
              <span className="font-bold text-slate-700">Delivering to: </span>
              {orderConfirmedData.address}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack()
              } else {
                window.location.href = "/home"
              }
            }}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  // Address Selection View (Image 3)
  if (isAddressScreenOpen) {
    return (
      <div className="min-h-screen bg-[#f3f5f8] text-slate-800 flex justify-center py-4 px-2 sm:px-4 font-sans">
        <div className="max-w-md w-full bg-[#f8fafc] min-h-screen shadow-lg rounded-2xl flex flex-col justify-between overflow-hidden border border-slate-200/80">
          <div>
            {/* Header */}
            <div className="bg-white px-4 py-3.5 border-b border-slate-100 flex items-center gap-3 sticky top-0 z-20">
              <button
                type="button"
                onClick={() => setIsAddressScreenOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-base font-extrabold text-slate-900">Select delivery address</h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Add a new address button */}
              <button
                type="button"
                onClick={() => setShowAddAddressModal(true)}
                className="w-full bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3 text-emerald-700 hover:border-emerald-500 font-extrabold text-sm transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Add a new address</span>
              </button>

              {/* Your saved address Section */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
                  Your saved address
                </h3>
                <div className="space-y-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id
                    return (
                      <div
                        key={addr.id}
                        onClick={() => {
                          setSelectedAddressId(addr.id)
                          setIsAddressScreenOpen(false)
                        }}
                        className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer flex items-start justify-between gap-3 shadow-xs ${
                          isSelected ? "border-emerald-600 ring-2 ring-emerald-500/20" : "border-slate-200/90 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            {addr.type.toLowerCase() === "work" ? (
                              <Users className="w-5 h-5" />
                            ) : (
                              <Home className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900">{addr.type}</h4>
                              {isSelected && (
                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                  SELECTED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed line-clamp-3">
                              {addr.address}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setNewAddressText(addr.address)
                            setNewAddressType(addr.type)
                            setShowAddAddressModal(true)
                          }}
                          className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-emerald-700 transition-colors shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Add Address Modal */}
          {showAddAddressModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-extrabold text-slate-900">Add Address in Hosur</h3>
                  <button onClick={() => setShowAddAddressModal(false)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Save Address as</label>
                    <div className="flex gap-2">
                      {["Home", "Work", "Other"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewAddressType(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            newAddressType === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Complete Address</label>
                    <textarea
                      rows={3}
                      value={newAddressText}
                      onChange={(e) => setNewAddressText(e.target.value)}
                      placeholder="House/Flat No., Building, Street, Area, Hosur..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewAddress}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Save &amp; Select Address
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main "My Cart" View (Image 2 & Image 4)
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex justify-center py-0 sm:py-8 px-0 sm:px-4 font-sans">
      <div className="max-w-md sm:max-w-xl md:max-w-2xl w-full bg-white sm:rounded-3xl shadow-xl border border-slate-200/80 flex flex-col justify-between overflow-hidden">
        <div>
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-none">My Cart</h1>
                <span className="text-[11px] font-semibold text-slate-400">Hosur Express Delivery</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "My Vegetables Cart", url: window.location.href }).catch(() => {})
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100/60 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/60 transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share Cart</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4 bg-slate-50/50">
            {/* Delivery Time Banner (Image 2 & 4) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-6 h-6 text-amber-600 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Delivery in 15 minutes</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Shipment of {cart.reduce((a, b) => a + (b.quantity || 1), 0)} farm-fresh items
                </p>
              </div>
            </div>

            {/* Cart Items List (Image 2 & 4) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs divide-y divide-slate-100 space-y-3.5">
              {cart.map((item, idx) => (
                <div key={item.id || idx} className={`flex items-center justify-between gap-3.5 ${idx > 0 ? "pt-3.5" : ""}`}>
                  {/* Left: Product Thumbnail */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#f5f1eb] overflow-hidden shrink-0 border border-slate-100 shadow-2xs">
                    <img
                      src={item.image || "/mockups/category_food_health.png"}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = "/mockups/category_food_health.png"
                      }}
                    />
                  </div>

                  {/* Middle: Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                      {item.displayName || item.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.unit || "1 unit"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black text-slate-900">₹{item.price}</span>
                      {item.mrp && (
                        <span className="text-xs line-through text-slate-400 font-semibold">
                          ₹{item.mrp}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Counter Button (Green style matching Image 2 & 4) */}
                  <div className="flex items-center bg-[#15803d] hover:bg-[#166534] text-white rounded-xl px-2.5 py-1.5 shadow-xs shrink-0 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="text-white hover:text-emerald-100 font-black text-sm px-1.5 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-black min-w-[18px] text-center px-1">
                      {item.quantity || 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="text-white hover:text-emerald-100 font-black text-sm px-1.5 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Details Card (Image 2 & 4) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Bill details</h3>

              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Items total</span>
                  {savings > 0 && (
                    <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                      Saved ₹{savings}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {savings > 0 && (
                    <span className="line-through text-slate-400 text-xs">₹{itemsOriginalTotal}</span>
                  )}
                  <span className="font-bold text-slate-900">₹{itemsTotal}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <span>Delivery charge</span>
                  <Info className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <span className={`font-bold ${deliveryCharge === 0 ? "text-emerald-700" : "text-slate-900"}`}>
                  {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Handling charge</span>
                  <Info className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <span className="font-bold text-slate-900">₹{handlingCharge}</span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-1">
                  <Droplets className="w-4 h-4 text-slate-400" />
                  <span>Rain surge / High demand charge</span>
                  <Info className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <span className="font-bold text-slate-900">₹{surgeCharge}</span>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm sm:text-base font-extrabold text-slate-900">Grand total</span>
                <span className="text-base sm:text-lg font-black text-slate-900">₹{grandTotal}</span>
              </div>
            </div>

            {/* Feeding India Donation Card (Image 2 & 4) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <span className="text-lg">🍲</span>
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">Feeding India donation</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                    Working towards a malnutrition free India.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <span className="text-xs font-black text-slate-900">₹1</span>
                <input
                  type="checkbox"
                  checked={isDonationChecked}
                  onChange={(e) => setIsDonationChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>
            </div>

            {/* Tip Your Delivery Partner Card (Image 2 & 4) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Tip your delivery partner</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Your kindness means a lot! 100% of your tip will go directly to your delivery partner.
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: "₹20", val: 20, icon: "👏" },
                  { label: "₹30", val: 30, icon: "💌" },
                  { label: "₹50", val: 50, icon: "❤️" },
                  { label: "Custom", val: "custom", icon: "✨" },
                ].map((t) => {
                  const isSelected = selectedTip === t.val
                  return (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        if (selectedTip === t.val) {
                          setSelectedTip(null)
                          setIsCustomTipOpen(false)
                        } else {
                          setSelectedTip(t.val)
                          setIsCustomTipOpen(t.val === "custom")
                        }
                      }}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-extrabold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-600 text-emerald-800 shadow-2xs"
                          : "bg-slate-50 hover:bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
              {isCustomTipOpen && (
                <div className="pt-2">
                  <input
                    type="number"
                    value={customTip}
                    onChange={(e) => setCustomTip(e.target.value)}
                    placeholder="Enter custom tip amount (₹)"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-emerald-600"
                  />
                </div>
              )}
            </div>

            {/* Cancellation Policy Card (Image 2 & 4) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-1">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Cancellation Policy</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">
                Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.
              </p>
            </div>
          </div>
        </div>

        {/* Delivering to Home & Sticky Bottom Checkout Bar (Image 2 & 4) */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 sm:p-5 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] z-30 space-y-3">
          {/* Delivering to Home Address Bar */}
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 block leading-tight">
                  Delivering to {activeAddressObj?.type || "Home"}
                </span>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px] sm:max-w-[340px]">
                  {activeAddressObj?.address || "Hosur, Tamil Nadu"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddressScreenOpen(true)}
              className="text-xs sm:text-sm font-extrabold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 cursor-pointer"
            >
              Change
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 text-center">{errorMsg}</p>
          )}

          {/* Proceed To Pay Bar */}
          <button
            type="button"
            disabled={isSubmitting || cart.length === 0}
            onClick={handleProceedToPay}
            className="w-full bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 text-white rounded-2xl p-4 flex items-center justify-between font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-700/20 cursor-pointer active:scale-98 transition-all"
          >
            <div className="text-left flex flex-col">
              <span className="text-base sm:text-lg font-black leading-none">₹{grandTotal}</span>
              <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mt-0.5">TOTAL</span>
            </div>
            <div className="flex items-center gap-2 font-black">
              <span>{isSubmitting ? "Placing Order..." : "Proceed To Pay"}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STEP WORKFLOW CHECKOUT (Urban-style Accordion & Slot Booking)
   ───────────────────────────────────────────────────────────── */

function StepWorkflowCheckout({
  category,
  cart,
  setCart,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  formData,
  onChange,
  onOpenMap,
  onSubmit,
  loading,
  error,
  onBack
}) {
  const [showSlotPicker, setShowSlotPicker] = useState(!selectedDate || !selectedTime)
  const isSlotSelected = Boolean(selectedDate && selectedTime)
  const [avoidCalling, setAvoidCalling] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [couponApplied, setCouponApplied] = useState(false)
  const [tip, setTip] = useState(0)
  const [customTip, setCustomTip] = useState("")
  const [payMethod, setPayMethod] = useState("online")
  const [editingPhone, setEditingPhone] = useState(false)
  const [showSavedAddrModal, setShowSavedAddrModal] = useState(false)
  const [showAddSearchModal, setShowAddSearchModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedSearchLoc, setSelectedSearchLoc] = useState("")

  const availableDates = useMemo(() => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dateStr = d.toISOString().split("T")[0]
      let label = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
      if (i === 0) label = `Today, ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`
      if (i === 1) label = `Tomorrow, ${d.getDate()} ${d.toLocaleDateString("en-US", { month: "short" })}`
      dates.push({ dateStr, label, dayName: d.toLocaleDateString("en-US", { weekday: "short" }), dayNum: d.getDate() })
    }
    return dates
  }, [])

  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
  ]

  const isFreeCategory = category?.id === "painting" || category?.id === "mason";
  const items = cart && cart.length > 0 ? cart : [{
    id: "def-1",
    name: isFreeCategory ? "Free Site Inspection" : (category?.name || "Service Booking"),
    price: isFreeCategory ? 0 : 1198,
    quantity: 1
  }]

  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const origTotal = Math.round(itemTotal * 1.1)
  const discount = couponApplied ? Math.min(100, Math.floor(itemTotal * 0.1)) : 100
  const taxFee = itemTotal === 0 ? 49 : 99
  const tipAmount = tip === "custom" ? (parseInt(customTip) || 0) : (tip || 0)
  const grandTotal = Math.max(0, itemTotal + taxFee - (itemTotal === 0 ? 0 : discount) + tipAmount)

  const relatedServicesCatalog = {
    ac: [
      { id: "rel-ac-1", name: "Anti-Rust Protective Coating", price: 249, origPrice: 399, duration: "20 mins", rating: "4.8", reviews: "12K", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80&fit=crop" },
      { id: "rel-ac-2", name: "AC Gas Leak Audit & Top-Up", price: 499, origPrice: 799, duration: "30 mins", rating: "4.9", reviews: "24K", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&q=80&fit=crop" },
      { id: "rel-ac-3", name: "Foam Filter Deep Sanitization", price: 199, origPrice: 299, duration: "15 mins", rating: "4.8", reviews: "18K", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop" },
      { id: "rel-ac-4", name: "Drain Pipe Flushing & De-clog", price: 149, origPrice: 249, duration: "15 mins", rating: "4.7", reviews: "9K", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop" }
    ],
    cleaning: [
      { id: "rel-cl-1", name: "Kitchen Sink Drain Degrease", price: 199, origPrice: 299, duration: "15 mins", rating: "4.8", reviews: "15K", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80&fit=crop" },
      { id: "rel-cl-2", name: "Balcony Pressure Wash Polish", price: 299, origPrice: 499, duration: "25 mins", rating: "4.7", reviews: "21K", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop" },
      { id: "rel-cl-3", name: "Chimney Filter Oil Degreasing", price: 349, origPrice: 499, duration: "30 mins", rating: "4.9", reviews: "32K", image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=400&q=80&fit=crop" },
      { id: "rel-cl-4", name: "Ceiling Fan & Light Wipe", price: 149, origPrice: 249, duration: "15 mins", rating: "4.8", reviews: "10K", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop" }
    ],
    painting: [
      { id: "rel-pt-1", name: "Anti-Dampness Primer Shield", price: 399, origPrice: 599, duration: "30 mins", rating: "4.8", reviews: "14K", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80&fit=crop" },
      { id: "rel-pt-2", name: "Furniture Masking Protection", price: 199, origPrice: 299, duration: "20 mins", rating: "4.7", reviews: "8K", image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80&fit=crop" },
      { id: "rel-pt-3", name: "Wall Crack Filler (2 Walls)", price: 299, origPrice: 499, duration: "25 mins", rating: "4.9", reviews: "27K", image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&q=80&fit=crop" },
      { id: "rel-pt-4", name: "Post-Paint Floor Scrub Cleanup", price: 499, origPrice: 699, duration: "40 mins", rating: "4.8", reviews: "19K", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80&fit=crop" }
    ],
    plumbing: [
      { id: "rel-pl-1", name: "Tap Spout Aerator Replacement", price: 149, origPrice: 249, duration: "15 mins", rating: "4.8", reviews: "16K", image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&q=80&fit=crop" },
      { id: "rel-pl-2", name: "Drain Gel De-clogging Treatment", price: 199, origPrice: 299, duration: "20 mins", rating: "4.9", reviews: "22K", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop" },
      { id: "rel-pl-3", name: "High Pressure Pipe Seal Tape", price: 99, origPrice: 199, duration: "10 mins", rating: "4.7", reviews: "11K", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop" },
      { id: "rel-pl-4", name: "Tank Float Valve Safety Check", price: 249, origPrice: 399, duration: "20 mins", rating: "4.8", reviews: "13K", image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=400&q=80&fit=crop" }
    ],
    electrical: [
      { id: "rel-el-1", name: "MCB Trip Switch Safety Audit", price: 199, origPrice: 299, duration: "15 mins", rating: "4.8", reviews: "17K", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80&fit=crop" },
      { id: "rel-el-2", name: "Socket Voltage & Earthing Test", price: 149, origPrice: 249, duration: "15 mins", rating: "4.7", reviews: "14K", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&q=80&fit=crop" },
      { id: "rel-el-3", name: "Appliance Cable Concealing", price: 299, origPrice: 499, duration: "25 mins", rating: "4.8", reviews: "20K", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop" },
      { id: "rel-el-4", name: "Fan Speed Regulator Polish", price: 119, origPrice: 199, duration: "10 mins", rating: "4.9", reviews: "25K", image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=400&q=80&fit=crop" }
    ],
    masonry: [
      { id: "rel-ms-1", name: "Tile Joint Waterproof Grout", price: 499, origPrice: 799, duration: "30 mins", rating: "4.9", reviews: "30K", image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&q=80&fit=crop" },
      { id: "rel-ms-2", name: "Debris Bagging & Transport Prep", price: 349, origPrice: 499, duration: "25 mins", rating: "4.8", reviews: "15K", image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80&fit=crop" },
      { id: "rel-ms-3", name: "Wall Plastering Touch-Up", price: 299, origPrice: 449, duration: "20 mins", rating: "4.7", reviews: "18K", image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&q=80&fit=crop" },
      { id: "rel-ms-4", name: "Laser Level Surface Scan Audit", price: 199, origPrice: 299, duration: "15 mins", rating: "4.8", reviews: "12K", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80&fit=crop" }
    ],
    general: [
      { id: "rel-gn-1", name: "Post-Service Sanitization", price: 199, origPrice: 299, duration: "15 mins", rating: "4.8", reviews: "28K", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80&fit=crop" },
      { id: "rel-gn-2", name: "Express Priority Slot Assurance", price: 149, origPrice: 249, duration: "Instant", rating: "4.9", reviews: "50K", image: "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=400&q=80&fit=crop" },
      { id: "rel-gn-3", name: "Pre-Service Safety Inspection", price: 99, origPrice: 199, duration: "10 mins", rating: "4.8", reviews: "22K", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=400&q=80&fit=crop" },
      { id: "rel-gn-4", name: "Eco Waste Disposal & Cleanup", price: 129, origPrice: 199, duration: "15 mins", rating: "4.7", reviews: "19K", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80&fit=crop" }
    ]
  };

  const categoryKey = useMemo(() => {
    const raw = (category?.name || category?.id || category?.slug || items[0]?.name || "").toLowerCase();
    if (raw.includes("ac") || raw.includes("hvac") || raw.includes("appliance") || raw.includes("foam")) return "ac";
    if (raw.includes("clean") || raw.includes("sofa") || raw.includes("kitchen") || raw.includes("bathroom")) return "cleaning";
    if (raw.includes("paint") || raw.includes("waterproof") || raw.includes("texture")) return "painting";
    if (raw.includes("plumb") || raw.includes("pipe") || raw.includes("tap")) return "plumbing";
    if (raw.includes("electr") || raw.includes("wire") || raw.includes("light")) return "electrical";
    if (raw.includes("mason") || raw.includes("brick") || raw.includes("civil") || raw.includes("demolition")) return "masonry";
    return "general";
  }, [category, items]);

  const [dynamicRelatedServices, setDynamicRelatedServices] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadBackendRelated() {
      try {
        const res = await apiRequest("/catalog/services/");
        if (res && isMounted) {
          const list = Array.isArray(res) ? res : (res.results || []);
          if (list.length > 0) {
            const filtered = list.filter(s => {
              const sCat = (s.category_slug || s.category_id || s.category_name || s.category || "").toString().toLowerCase();
              const sName = (s.name || "").toLowerCase();
              if (categoryKey === "ac") return sCat.includes("ac") || sCat.includes("hvac") || sName.includes("ac");
              if (categoryKey === "cleaning") return sCat.includes("clean") || sName.includes("clean");
              if (categoryKey === "painting") return sCat.includes("paint") || sName.includes("paint");
              if (categoryKey === "plumbing") return sCat.includes("plumb") || sName.includes("plumb");
              if (categoryKey === "electrical") return sCat.includes("electr") || sName.includes("electr");
              if (categoryKey === "masonry") return sCat.includes("mason") || sName.includes("mason");
              return true;
            });

            if (filtered.length > 0) {
              const mapped = filtered.slice(0, 4).map((s, idx) => ({
                id: s.id ? s.id.toString() : `backend-rel-${idx}`,
                name: s.name,
                price: parseFloat(s.price) || 249,
                origPrice: Math.round((parseFloat(s.price) || 249) * 1.35),
                duration: s.duration || "20 mins",
                icon: s.image ? null : (categoryKey === "ac" ? "❄️" : categoryKey === "cleaning" ? "🧼" : categoryKey === "painting" ? "🎨" : "✨"),
                image: s.image || null
              }));
              setDynamicRelatedServices(mapped);
            }
          }
        }
      } catch (e) {
        console.log("Using static category related services", e);
      }
    }
    loadBackendRelated();
    return () => { isMounted = false; };
  }, [categoryKey, category]);

  const displayCategoryTitle = useMemo(() => {
    if (cart && cart.length > 0) {
      if (cart[0].categoryName) return cart[0].categoryName;
      const first = cart[0].name.toLowerCase();
      if (first.includes("washing") || first.includes("fridge") || first.includes("appliance")) return "Appliance Service & Repair";
      if (first.includes("ac") || first.includes("foam") || first.includes("jet") || first.includes("heating")) return "AC & Heating";
      if (first.includes("clean") || first.includes("sofa") || first.includes("kitchen")) return "Home Cleaning Services";
      if (first.includes("paint") || first.includes("waterproof")) return "Painting & Waterproofing";
      if (first.includes("plumb") || first.includes("drain") || first.includes("tap")) return "Plumbing Services";
    }
    if (category?.name && category.name !== "General Service") return category.name;
    return "Services Added";
  }, [category, cart]);

  const addItem = (id) => {
    setCart(prev => {
      const current = prev || [];
      return current.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
    });
  };

  const removeItem = (id) => {
    setCart(prev => {
      if (!prev) return [];
      const existing = prev.find(item => item.id === id);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const nextCart = prev.filter(item => item.id !== id);
        if (nextCart.length === 0 && onBack) {
          setTimeout(() => {
            onBack();
          }, 100);
        }
        return nextCart;
      }
      return prev.map(item => item.id === id ? { ...item, quantity: item.quantity - 1 } : item);
    });
  };

  const relatedExtraServices = dynamicRelatedServices.length > 0
    ? dynamicRelatedServices
    : (relatedServicesCatalog[categoryKey] || relatedServicesCatalog.general);

  const addExtraRelatedService = (extraItem) => {
    setCart(prev => {
      const currentCart = prev && prev.length > 0 ? prev : [];
      const existing = currentCart.find(i => i.id === extraItem.id);
      if (existing) {
        return currentCart.map(i => i.id === extraItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...currentCart, { id: extraItem.id, name: extraItem.name, price: extraItem.price, origPrice: extraItem.origPrice, quantity: 1, duration: extraItem.duration }];
    });
  };

  const removeExtraRelatedService = (extraItemId) => {
    setCart(prev => {
      if (!prev) return [];
      const existing = prev.find(i => i.id === extraItemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter(i => i.id !== extraItemId);
      }
      return prev.map(i => i.id === extraItemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 font-sans text-slate-800">

      {/* Top Header Bar with Back to Services Button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <ChevronLeft size={16} />
          <span>Back to Services</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* LEFT COLUMN: Steps / Workflow Accordion */}
        <div className="lg:col-span-7 space-y-6">

          {/* Main Accordion Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">

            {/* Step 1: Phone / Contact */}
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-500 block mb-0.5">Send booking details to</span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">
                    {formData.phone ? `+91 ${formData.phone}` : "Not Provided"}
                  </span>
                  <button onClick={() => setEditingPhone(!editingPhone)} className="text-xs font-bold text-indigo-600 hover:underline">
                    {editingPhone ? "Save" : "Change"}
                  </button>
                </div>
                {editingPhone && (
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={onChange}
                    placeholder="Enter phone number"
                    className="mt-2 text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-full outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* Step 2: Address */}
            <div className="p-5 flex items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-500">Address</span>
                  <button
                    onClick={() => setShowSavedAddrModal(true)}
                    className="border border-slate-200 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-800 leading-snug">
                  {formData.address || "Select service address"}
                </p>
              </div>
            </div>

            {/* Step 3: Slot (Time & Date) */}
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-500 block mb-2">Slot</span>

                  {/* Select button or current slot */}
                  {isSlotSelected && !showSlotPicker ? (
                    <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
                      <div>
                        <span className="text-xs font-black text-indigo-950 block">
                          {selectedDate}
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          {selectedTime}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowSlotPicker(true)}
                        className="text-xs font-bold text-indigo-600 hover:underline"
                      >
                        Change slot
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSlotPicker(true)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99]"
                    >
                      Select time & date
                    </button>
                  )}

                  {/* Inline Slot Picker Panel */}
                  {showSlotPicker && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">

                      {/* Date Pills */}
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                          Select Date
                        </label>
                        <div className="flex flex-wrap gap-2 pb-1">
                          {availableDates.map(item => {
                            const isSel = selectedDate === item.dateStr
                            return (
                              <button
                                key={item.dateStr}
                                onClick={() => onDateChange(item.dateStr)}
                                className={`flex flex-col items-center justify-center min-w-[70px] p-2.5 rounded-xl border text-center transition-all cursor-pointer ${isSel
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                                  }`}
                              >
                                <span className="text-[10px] font-bold opacity-80 uppercase">{item.dayName}</span>
                                <span className="text-sm font-black mt-0.5">{item.dayNum}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Time Slot Grid */}
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                          Select Time Slot
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {timeSlots.map(t => {
                            const isSel = selectedTime === t
                            return (
                              <button
                                key={t}
                                onClick={() => {
                                  onTimeChange(t)
                                  if (selectedDate) setShowSlotPicker(false)
                                }}
                                className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${isSel
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-white"
                                  }`}
                              >
                                {t}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {isSlotSelected && (
                        <div className="pt-2 text-right">
                          <button
                            onClick={() => setShowSlotPicker(false)}
                            className="bg-indigo-600 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-xs hover:bg-indigo-700 transition-all"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 4: Payment Method */}
            <div className={`p-5 flex items-start gap-4 ${!isSlotSelected ? "opacity-50" : ""}`}>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                <CreditCard size={18} />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-slate-500 block mb-2">Payment Method</span>

                {isSlotSelected ? (
                  <div className="space-y-3">
                    <div
                      onClick={() => setPayMethod("online")}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${payMethod === "online"
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">💳</div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">Pay Online</span>
                          <span className="text-[10px] text-slate-500 font-medium">UPI / Cards / Netbanking</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">RECOMMENDED</span>
                    </div>

                    <div
                      onClick={() => setPayMethod("cash")}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${payMethod === "cash"
                        ? "border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600"
                        : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">💵</div>
                        <div>
                          <span className="text-xs font-black text-slate-900 block">Pay After Service</span>
                          <span className="text-[10px] text-slate-500 font-medium">Pay cash or UPI to expert</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">CASH</span>
                    </div>

                    {error && (
                      <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                        {error}
                      </div>
                    )}

                    <button
                      onClick={() => onSubmit(payMethod)}
                      disabled={loading}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:bg-slate-300"
                    >
                      {loading ? "Processing..." : `Confirm Booking · ₹${grandTotal.toLocaleString("en-IN")}`}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400">Select slot above to unlock payment</span>
                )}
              </div>
            </div>

          </div>

          {/* Cancellation Policy */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
            <h4 className="text-xs font-black text-slate-900">Cancellation policy</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Free cancellations if done more than 12 hrs before the service. A fee will be charged otherwise.
            </p>
            <button className="text-xs font-extrabold text-indigo-600 hover:underline pt-1">
              Read full policy
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Cart Items & Payment Summary */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">

          {/* Items Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
              {displayCategoryTitle}
            </h4>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2.5">
                  <p className="text-xs font-bold text-slate-500">Your cart is currently empty</p>
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                  >
                    <Plus size={13} strokeWidth={3} />
                    <span>Choose Services</span>
                  </button>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-800 flex-1">{item.name}</span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-0.5 bg-slate-50 font-bold">
                      <button type="button" onClick={() => removeItem(item.id)} className="hover:text-indigo-600 text-slate-500 font-extrabold cursor-pointer px-1">-</button>
                      <span className="text-slate-800 font-black">{item.quantity}</span>
                      <button type="button" onClick={() => addItem(item.id)} className="hover:text-indigo-600 text-slate-500 font-extrabold cursor-pointer px-1">+</button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                      {origTotal > itemTotal && (
                        <span className="text-[10px] text-slate-400 line-through block">
                          ₹{(origTotal * item.quantity).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkbox option */}
            <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="avoidCalling"
                checked={avoidCalling}
                onChange={e => setAvoidCalling(e.target.checked)}
                className="accent-indigo-600 mt-0.5 rounded shrink-0 cursor-pointer"
              />
              <label htmlFor="avoidCalling" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                Avoid calling before reaching the location
              </label>
            </div>
          </div>

          {/* Coupons Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                %
              </div>
              <span className="text-xs font-black text-slate-900">Coupons and offers</span>
            </div>
            <button
              onClick={() => setCouponApplied(!couponApplied)}
              className="text-xs font-extrabold text-indigo-600 hover:underline"
            >
              {couponApplied ? "1 applied ✓" : "9 offers >"}
            </button>
          </div>

          {/* Payment Summary */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
              Payment summary
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Item total</span>
                <div className="text-right">
                  <span className="line-through text-slate-400 mr-1.5">₹{origTotal.toLocaleString("en-IN")}</span>
                  <span className="font-bold text-slate-800">₹{itemTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Taxes and Fee</span>
                <span className="font-bold text-slate-800">₹{taxFee}</span>
              </div>

              {couponApplied && (
                <div className="flex justify-between text-indigo-700 font-bold">
                  <span>Coupon Discount</span>
                  <span>-₹{discount}</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-2 flex justify-between font-black text-slate-900 text-sm">
                <span>Total amount</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>

              <div className="flex justify-between font-black text-indigo-700 text-sm pt-1">
                <span>Amount to pay</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Tip Section */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Add a tip to thank the Professional
              </span>

              <div className="grid grid-cols-4 gap-2">
                {[50, 75, 100].map(amt => {
                  const isSel = tip === amt
                  return (
                    <button
                      key={amt}
                      onClick={() => setTip(isSel ? null : amt)}
                      className={`relative py-2 rounded-xl border text-xs font-bold transition-all ${isSel
                        ? "border-indigo-600 bg-indigo-50/60 text-indigo-700"
                        : "border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                    >
                      ₹{amt}
                      {amt === 75 && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.2 rounded-full whitespace-nowrap">
                          POPULAR
                        </span>
                      )}
                    </button>
                  )
                })}
                <button
                  onClick={() => setTip(tip === "custom" ? null : "custom")}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${tip === "custom"
                    ? "border-indigo-600 bg-indigo-50/60 text-indigo-700"
                    : "border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                >
                  Custom
                </button>
              </div>

              {tip === "custom" && (
                <input
                  type="number"
                  placeholder="Enter tip amount"
                  value={customTip}
                  onChange={e => setCustomTip(e.target.value)}
                  className="w-full mt-2 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-bold"
                />
              )}

              <span className="text-[10px] text-slate-400 block text-center pt-1">
                100% of the tip goes to the professional.
              </span>
            </div>
          </div>

          {/* Urban Company "People also take" Slider Component */}
          <PeopleAlsoTake category={category} cart={cart} setCart={setCart} />

        </div>

      </div>

      {showSavedAddrModal && (
        <SavedAddressesModal
          onClose={() => setShowSavedAddrModal(false)}
          currentAddress={formData.address}
          onSelectAddress={(addr) => {
            onChange({ target: { name: "address", value: addr } })
          }}
          onAddNewAddress={() => {
            setShowSavedAddrModal(false)
            setShowAddSearchModal(true)
          }}
        />
      )}

      {showAddSearchModal && (
        <AddAddressSearchModal
          onClose={() => setShowAddSearchModal(false)}
          onSelectLocation={(loc) => {
            setShowAddSearchModal(false)
            if (loc) {
              onChange({ target: { name: "address", value: loc } })
              if (typeof setLocation === "function") setLocation(loc)
              localStorage.setItem("calservice_user_location", loc)
            }
          }}
          onUseCurrentLocation={() => {
            setShowAddSearchModal(false)
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                  const res = await fetch(`https://photon.komoot.io/reverse?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`);
                  const data = await res.json();
                  if (data?.features?.[0]?.properties) {
                    const p = data.features[0].properties;
                    const display = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
                    if (display) {
                      onChange({ target: { name: "address", value: display } });
                      if (typeof setLocation === "function") setLocation(display);
                      localStorage.setItem("calservice_user_location", display);
                    }
                  }
                } catch (e) { }
              });
            }
          }}
        />
      )}
    </div>
  )
}

export function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const routerLocation = useLocation()
  const incomingCart = routerLocation.state?.cart
  const incomingCategory = routerLocation.state?.category
  // BookingPage is purely a checkout flow — if no cart arrives, go back to landing page (/home)
  useEffect(() => {
    if (!incomingCart?.length && !incomingCategory && !routerLocation.state?.triggerLocPicker) {
      navigate(routes.landing, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [step, setStep] = useState(() => {
    if (routerLocation.state?.triggerLocPicker) {
      return 1;
    }
    return incomingCart?.length ? 3 : 1;
  })
  const [loading, setLoading] = useState(false)
  const [showCartMenu, setShowCartMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [error, setError] = useState(null)
  const [successData, setSuccessData] = useState(null)
  const [category, setCategory] = useState(incomingCategory || null)
  const [cart, setCart] = useState(incomingCart || [])

  // When customer removes all items (- button), automatically move back to home services selection side (/home)
  useEffect(() => {
    if (Array.isArray(cart) && cart.length === 0) {
      const timer = setTimeout(() => {
        navigate(routes.landing, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [cart, navigate]);
  const [selDate, setSelDate] = useState("")
  const [selTime, setSelTime] = useState("")
  const [urgency, setUrgency] = useState("Standard")
  const [notes, setNotes] = useState("")
  const [formData, setFormData] = useState({ customer_name: "", phone: "", email: "", issue_title: "", description: "", address: "" })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showSubCategoryChoiceModal, setShowSubCategoryChoiceModal] = useState(false)
  const [dynamicReviews, setDynamicReviews] = useState([])

  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("Set location")
  const [showLocPicker, setShowLocPicker] = useState(false)
  const [showPostFlow, setShowPostFlow] = useState(false)
  const [assignedTech, setAssignedTech] = useState(null)
  const [showAccountPortal, setShowAccountPortal] = useState(false)
  const [activeAccountTab, setActiveAccountTab] = useState("My Profile")
  const contentRef = useRef()

  // Auth state — customer profile + bookings
  const { user, refreshMe } = useAuth()
  const [showCustomerEntryModal, setShowCustomerEntryModal] = useState(false)
  const [customerBookings, setCustomerBookings] = useState([])
  const hasNonDraftBookings = customerBookings.some(b => b.status !== "draft")

  // Auto-sync customer name, phone, and email from authenticated user session
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customer_name: prev.customer_name || user.full_name || user.fullName || user.first_name || user.username || "Customer",
        phone: prev.phone || user.phone || user.mobile || "9150632938",
        email: prev.email || user.email || ""
      }))
    }
  }, [user])

  useEffect(() => { contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }) }, [step])

  // Inject Google GSI client library dynamically
  useEffect(() => {
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(p => ({ ...p, [name]: value }))
  }

  const [categoriesData, setCategoriesData] = useState([])
  const [packagesData, setPackagesData] = useState({})

  useEffect(() => {
    async function loadCatalog() {
      try {
        const catRes = await apiRequest("/catalog/categories/")
        const svcRes = await apiRequest("/catalog/services/")
        if (catRes.success) {
          const cats = catRes.data.map((c, i) => ({
            id: c.id.toString(),
            name: c.name,
            desc: c.description || "Expert " + c.name + " service",
            rating: c.rating || "4.8",
            jobs: c.jobs_count_str || "10K+",
            image: c.image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop"
          }))
          setCategoriesData(cats)
        }
        if (svcRes.success) {
          if (svcRes.currency_symbol) {
            BOOKING_CURRENCY_SYMBOL = svcRes.currency_symbol;
          }
          const pkgs = {}
          svcRes.data.forEach(s => {
            const cid = s.category.toString()
            if (!pkgs[cid]) pkgs[cid] = []
            pkgs[cid].push({
              id: s.id.toString(),
              name: s.name,
              price: parseFloat(s.price),
              priceStr: BOOKING_CURRENCY_SYMBOL + s.price,
              duration: s.duration || "1 hr",
              payment_policy: s.payment_policy,
              image: s.image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
              includes: Array.isArray(s.includes) && s.includes.length > 0 ? s.includes : ["Standard inclusions"],
              excludes: Array.isArray(s.excludes) ? s.excludes : [],
              popular: !!s.popular,
              tag: s.tag || ""
            })
          })
          setPackagesData(pkgs)
        }
      } catch (e) {
        console.error("Failed to load catalog", e)
      }
    }
    loadCatalog()
  }, [])

  // Requirement 1 of Prompt 3: Resolve location from customer profile (last_known_location), fallback to "Set location"
  useEffect(() => {
    const locObj = user?.last_known_location || user?.lastKnownLocation
    if (locObj) {
      if (typeof locObj === "string" && locObj.trim()) {
        setLocation(locObj)
        return
      }
      if (locObj.label) {
        setLocation(locObj.label)
        return
      }
    }
    if (user?.address) {
      setLocation(user.address)
      return
    }

    // Fetch initial location
    if (navigator.geolocation) {
      setLocation("Detecting location...")
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          fetch(`https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`)
            .then(res => res.json())
            .then(data => {
              if (data && data.features && data.features.length > 0) {
                const p = data.features[0].properties;
                const display = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
                setLocation(display);
              } else {
                setLocation("Hosur, Tamil Nadu, India");
              }
            })
            .catch(() => setLocation("Hosur, Tamil Nadu, India"));
        },
        () => {
          setLocation("Hosur, Tamil Nadu, India");
        }
      );
    } else {
      setLocation("Hosur, Tamil Nadu, India");
    }

    // Auto open location picker if triggerLocPicker was passed in navigation state
    if (routerLocation.state?.triggerLocPicker) {
      setShowLocPicker(true);
      setShowPackageModal(true);
    }
    // Fallback if null or manual entry skipped
    setLocation("Set location")
  }, [user])

  useEffect(() => {
    let query = "";
    if (category) {
      query = `?category=${encodeURIComponent(category.id || category.name)}`;
    }
    apiRequest(`/public/feedback/${query}`)
      .then(res => {
        if (res?.success && res.data && res.data.length > 0) {
          const formatted = res.data.map(r => ({
            name: r.name,
            rating: r.rating,
            text: r.text,
            cat: r.category,
            ago: getRelativeTime(r.submitted_at),
            avatar: generateAvatarUrl(r.name)
          }));
          setDynamicReviews(formatted);
        } else {
          setDynamicReviews([]);
        }
      })
      .catch(err => console.error("Error fetching feedback:", err));
  }, [category]);

  const handlePhoto = e => {
    const f = e.target.files[0]
    if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)) }
  }

  const handleSubmit = async (paymentMethod = "cash") => {
    if (!user && (!formData.phone || formData.phone === "9150632938")) {
      setShowCustomerEntryModal(true)
      return
    }
    setLoading(true); setError(null)
    // Map frontend choices to backend enum values
    const backendPaymentMethod = paymentMethod === "online" ? "ONLINE" : "COD"

    const data = new FormData()
    data.append("customer_name", formData.customer_name)
    data.append("phone", formData.phone)
    data.append("email", formData.email || "")
    data.append("service_category", category?.id || "general")
    data.append("issue_title", formData.issue_title || `${cart.map(c => c.name).join(', ')} — ${category?.name}`)
    let finalDesc = formData.description || "";
    if (urgency && urgency !== "Standard") {
      finalDesc += `\n[Urgency: ${urgency}]`;
    }
    if (notes) {
      finalDesc += `\n[Special Instructions: ${notes}]`;
    }
    data.append("description", finalDesc);
    data.append("address", formData.landmark ? formData.address + " | " + formData.landmark : formData.address)
    data.append("preferred_date", selDate)
    data.append("preferred_time", selTime)
    data.append("total_amount", cart.reduce((a, c) => a + (c.price * c.quantity), 0))
    // Serialize cart_data as JSON string •” backend will parse it robustly
    data.append("cart_data", JSON.stringify(cart.map(c => ({
      id: c.id, name: c.name, price: c.price, quantity: c.quantity,
      categoryName: c.categoryName || category?.name || ""
    }))))
    data.append("payment_method", backendPaymentMethod)
    if (photoFile) data.append("photo", photoFile)
    try {
      const res = await apiRequest("/booking/", { method: "POST", body: data })
      if (res?.success) {
        if (backendPaymentMethod === "ONLINE") {
          // If online payment was chosen, the mock payment gateway was already shown and simulated success.
          // Now we inform the backend that payment was collected successfully to confirm the booking.
          try {
            await apiRequest('/payment/verify/', {
              method: 'POST',
              json: { booking_id: res.data.id, order_id: `order_mock_${Date.now()}`, payment_id: `PAY_${Date.now().toString(36).toUpperCase()}`, mock_success: true }
            })
          } catch (e) {
            console.error("Failed to verify online payment:", e)
          }
        }
        setSuccessData({ ...res.data, paymentMethod: backendPaymentMethod })
        setShowPostFlow(true)  // Show animated post-booking flow
      } else setError(res?.message || "Something went wrong. Please try again.")
    } catch (err) {
      if (err?.body?.errors) {
        const msgs = Object.entries(err.body.errors).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(", ") : m}`).join(" Â· ")
        setError(msgs || err.body.message)
      } else setError(err?.body?.message || err?.body?.detail || "Connection error. Try again.")
    } finally { setLoading(false) }
  }


  const resetAll = () => {
    setCategory(null); setCart([]); setSelDate(""); setSelTime("")
    setFormData({ customer_name: "", phone: "", email: "", issue_title: "", description: "", address: "", landmark: "" })
    setPhotoFile(null); setPhotoPreview(null); setSuccessData(null); setError(null)
    setShowPostFlow(false); setAssignedTech(null)
    sessionStorage.removeItem(OTP_SESSION_KEY)
    // Return to public home services catalog page (/home)
    navigate(routes.landing, { replace: true })
  }

  const isQuickCommerce =
    category?.isQuickCommerce ||
    incomingCategory?.isQuickCommerce ||
    routerLocation.state?.isQuickCommerce ||
    cart.some(i => i.serviceType === "vegetables_quick_delivery")

  if (isQuickCommerce && cart.length > 0) {
    return (
      <QuickCommerceCartCheckout
        cart={cart}
        setCart={setCart}
        category={category}
        user={user}
        onBack={() => navigate(routes.landing || "/home", { replace: true })}
      />
    )
  }

  return (
    <div className="uc-root">
      <BkStyles />



      {/* Post-Booking Animated Flow Overlay */}
      <AnimatePresence>
        {showPostFlow && (
          <PostBookingFlow
            bookingData={successData}
            category={category}
            cart={cart}
            formData={formData}
            selDate={selDate}
            selTime={selTime}
            onDone={(tech) => {
              setAssignedTech(tech)
              setShowPostFlow(false)
              setStep(0)
            }}
          />
        )}
      </AnimatePresence>



      {/* Account Portal Modal */}
      <AnimatePresence>
        {showAccountPortal && (
          <CustomerAccountModal
            activeTab={activeAccountTab}
            onChangeTab={setActiveAccountTab}
            onClose={() => setShowAccountPortal(false)}
          />
        )}
      </AnimatePresence>

      {/* Customer Login / OTP Flow Modal */}
      <AnimatePresence>
        {showCustomerEntryModal && (
          <CustomerEntryFlowModal
            isOpen={showCustomerEntryModal}
            onClose={() => setShowCustomerEntryModal(false)}
            onComplete={(locData) => {
              setShowCustomerEntryModal(false)
              // After login, sync user data into booking form
              setTimeout(() => {
                refreshMe && refreshMe()
              }, 200)
            }}
          />
        )}
      </AnimatePresence>

      {/* Urban Style Top Navigation Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Brand Logo & Urban Location Selector */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div
              className="flex items-center gap-2 select-none cursor-pointer"
              onClick={() => { setStep(1); setCategory(null); }}
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/20">
                <Home className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 hidden sm:inline">CalServices</span>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* Location Selector Pill */}
            <button
              onClick={() => setShowLocPicker(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-white text-xs font-extrabold text-slate-800 transition-all cursor-pointer shadow-2xs max-w-[220px] sm:max-w-[280px] truncate"
            >
              <MapPin size={15} className="text-indigo-600 shrink-0" />
              <span className="truncate">{location || formData?.address || "Select Location"}</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0 ml-auto" />
            </button>
          </div>

          {/* Right Controls: Cart & Profile Button */}
          <div className="flex items-center gap-3">
            {cart?.length > 0 && (
              <button
                onClick={() => setStep(3)}
                className="relative p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 text-slate-700 hover:text-indigo-600 transition-all cursor-pointer"
                title="View Cart"
              >
                <ShoppingCart size={18} />
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {cart.length}
                </span>
              </button>
            )}

            {/* Urban Profile Icon Button (Exact Home Page Visual Style) */}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  setActiveAccountTab(hasNonDraftBookings ? "My Bookings" : "My Profile")
                  setShowAccountPortal(true)
                } else {
                  setShowCustomerEntryModal(true)
                }
              }}
              className="flex items-center gap-2 text-slate-800 hover:text-slate-950 font-medium text-sm transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-full border border-slate-400 text-slate-700 flex items-center justify-center shrink-0 group-hover:border-slate-700 transition-colors">
                <User className="w-4 h-4 stroke-[1.75]" />
              </div>
              <span className="font-semibold text-slate-800 hidden sm:inline">
                {user ? `Hi, ${user?.fullName || user?.full_name || user?.firstName || user?.first_name || user?.username || "Customer"} 👋` : "Login / Sign Up"}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-600 stroke-[2] shrink-0 group-hover:text-slate-900 transition-colors hidden sm:inline" />
            </button>
          </div>

        </div>
      </header>






      {/* Main Content */}
      <main className="uc-main" ref={contentRef}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="tracking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LiveTrackingPage
                successData={successData}
                technician={assignedTech}
                category={category}
                cart={cart}
                formData={formData}
                selDate={selDate}
                selTime={selTime}
                onBookAgain={resetAll}
              />
            </motion.div>
          )}

          {/* Step 1 (StepHome) removed — service discovery lives on LandingPage */}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="uc-step-container">
                <StepLogin
                  category={category}
                  onBack={() => { setShowPackageModal(true); }}
                  onVerified={data => {
                    setFormData(p => ({
                      ...p,
                      customer_name: data.name || p.customer_name,
                      phone: data.phone || p.phone,
                      email: data.email || p.email,
                    }))
                    setStep(5)
                  }}
                />
              </div>
            </motion.div>
          )}

          {step >= 3 && step <= 6 && (
            <motion.div key="workflowCheckout" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <StepWorkflowCheckout
                category={category}
                cart={cart}
                setCart={setCart}
                selectedDate={selDate}
                selectedTime={selTime}
                onDateChange={setSelDate}
                onTimeChange={setSelTime}
                formData={formData}
                onChange={handleChange}
                onOpenMap={() => setShowLocPicker(true)}
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                onBack={() => {
                  let activeCat = category;
                  if (!activeCat && cart && cart.length > 0) {
                    const first = cart[0];
                    const catName = first.categoryName || first.name || "";
                    const nameLower = catName.toLowerCase();
                    if (nameLower.includes("ac") || nameLower.includes("foam") || nameLower.includes("heating") || nameLower.includes("appliance") || nameLower.includes("fridge") || nameLower.includes("washing")) {
                      activeCat = { id: "ac", name: "AC & Heating", slug: "ac" };
                    } else if (nameLower.includes("electric") || nameLower.includes("switch") || nameLower.includes("fan") || nameLower.includes("mcb") || nameLower.includes("wire")) {
                      activeCat = { id: "electrical", name: "Electrical", slug: "electrical" };
                    } else if (nameLower.includes("paint") || nameLower.includes("waterproof")) {
                      activeCat = { id: "painting", name: "Painting", slug: "painting" };
                    } else if (nameLower.includes("mason") || nameLower.includes("brick") || nameLower.includes("tile")) {
                      activeCat = { id: "mason", name: "Masonry", slug: "mason" };
                    } else if (nameLower.includes("plumb") || nameLower.includes("tap") || nameLower.includes("drain")) {
                      activeCat = { id: "plumbing", name: "Plumbing", slug: "plumbing" };
                    } else {
                      activeCat = { id: "cleaning", name: "Cleaning", slug: "cleaning" };
                    }
                    setCategory(activeCat);
                  }

                  if (activeCat) {
                    setShowPackageModal(true);
                  } else {
                    navigate(routes.landing, { state: { cart } });
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="uc-footer">
        <Shield size={12} /> SSL Encrypted &nbsp;Â·&nbsp;
        <Star size={12} style={{ fill: "#F59E0B", color: "#F59E0B" }} /> 4.8•˜… Rated &nbsp;Â·&nbsp;
        <CheckCircle2 size={12} /> 1M+ Bookings &nbsp;Â·&nbsp;
        <Award size={12} /> 30-Day Guarantee
      </footer>

      {/* Electrician, Plumbing & Carpentry Choice Modal */}
      <AnimatePresence>
        {showSubCategoryChoiceModal && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setShowSubCategoryChoiceModal(false);
              navigate(routes.landing, { state: { cart } });
            }}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowSubCategoryChoiceModal(false);
                  navigate(routes.landing, { state: { cart } });
                }}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-6">
                <h3 className="text-xl font-black text-slate-900">
                  Electrician, Plumbing &amp; Carpentry
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Choose a service type to view related services
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                {/* Electrician */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSubCategoryChoiceModal(false);
                    const safeCats = categoriesData.length > 0 ? categoriesData : CATEGORIES;
                    const targetCat = safeCats.find(c => c.id === "electrical" || c.id === "1") || { id: "electrical", name: "Electrical", desc: "Wiring, panels & lighting" };
                    setCategory(targetCat);
                    setShowPackageModal(true);
                  }}
                  className="group flex flex-col items-center justify-between p-4 rounded-2xl transition-all text-center cursor-pointer border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md"
                >
                  <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center p-3 group-hover:scale-105 transition-transform">
                    <Zap className="w-10 h-10 text-amber-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-3 group-hover:text-emerald-700">
                    Electrician
                  </span>
                </button>

                {/* Plumber */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSubCategoryChoiceModal(false);
                    const safeCats = categoriesData.length > 0 ? categoriesData : CATEGORIES;
                    const targetCat = safeCats.find(c => c.id === "plumbing" || c.id === "2") || { id: "plumbing", name: "Plumbing", desc: "Leaks, pipes & fixtures" };
                    setCategory(targetCat);
                    setShowPackageModal(true);
                  }}
                  className="group flex flex-col items-center justify-between p-4 rounded-2xl transition-all text-center cursor-pointer border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md"
                >
                  <div className="w-20 h-20 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center p-3 group-hover:scale-105 transition-transform">
                    <Droplets className="w-10 h-10 text-blue-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-3 group-hover:text-emerald-700">
                    Plumber
                  </span>
                </button>

                {/* Carpentry */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSubCategoryChoiceModal(false);
                    const safeCats = categoriesData.length > 0 ? categoriesData : CATEGORIES;
                    const targetCat = safeCats.find(c => c.id === "carpentry" || c.id === "3") || { id: "carpentry", name: "Carpentry", desc: "Furniture & wood repairs" };
                    setCategory(targetCat);
                    setShowPackageModal(true);
                  }}
                  className="group flex flex-col items-center justify-between p-4 rounded-2xl transition-all text-center cursor-pointer border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 hover:shadow-md"
                >
                  <div className="w-20 h-20 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center p-3 group-hover:scale-105 transition-transform">
                    <Hammer className="w-10 h-10 text-orange-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-800 mt-3 group-hover:text-emerald-700">
                    Carpentry
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Package Selection Modal Overlay */}
      <AnimatePresence>
        {showPackageModal && category && (
          (category.id === "painting" || category.slug === "painting" || String(category.id) === "painting" || category.name?.toLowerCase() === "painting") ? (
            <PaintingPackageModal
              category={category}
              cart={cart}
              setCart={setCart}
              onClose={() => {
                setShowPackageModal(false);
                navigate(routes.landing, { state: { cart } });
              }}
              onCheckout={() => { setShowPackageModal(false); setStep(3); }}
              onGetEstimate={() => {
                setShowLocPicker(true);
              }}
            />
          ) : (category.id === "mason" || category.slug === "mason" || String(category.id) === "mason" || category.name?.toLowerCase() === "mason") ? (
            <MasonPackageModal
              category={category}
              cart={cart}
              setCart={setCart}
              onClose={() => {
                setShowPackageModal(false);
                navigate(routes.landing, { state: { cart } });
              }}
              onCheckout={() => { setShowPackageModal(false); setStep(3); }}
              onGetEstimate={() => {
                setShowLocPicker(true);
              }}
              setPhotoFile={setPhotoFile}
              setPhotoPreview={setPhotoPreview}
            />
          ) : (
            <PackageModal
              category={category}
              cart={cart}
              setCart={setCart}
              packagesData={packagesData}
              onClose={() => {
                setShowPackageModal(false);
                navigate(routes.landing, { state: { cart } });
              }}
              onCheckout={() => { setShowPackageModal(false); setStep(3); }}
            />
          )
        )}
      </AnimatePresence>

      {showLocPicker && (
        <AddAddressSearchModal
          onClose={() => setShowLocPicker(false)}
          onSelectLocation={(loc) => {
            setShowLocPicker(false)
            if (loc) {
              setLocation(loc)
              setFormData(prev => ({ ...prev, address: loc }))
              localStorage.setItem("calservice_user_location", loc)
            }
          }}
          onUseCurrentLocation={() => {
            setShowLocPicker(false)
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                  const res = await fetch(`https://photon.komoot.io/reverse?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`);
                  const data = await res.json();
                  if (data?.features?.[0]?.properties) {
                    const p = data.features[0].properties;
                    const display = [p.name, p.street, p.city, p.state, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
                    if (display) {
                      setLocation(display);
                      setFormData(prev => ({ ...prev, address: display }));
                      localStorage.setItem("calservice_user_location", display);
                    }
                  }
                } catch (e) { }
              });
            }
          }}
        />
      )}

      <CustomerEntryFlowModal
        isOpen={showCustomerEntryModal}
        onClose={() => setShowCustomerEntryModal(false)}
        onComplete={() => {
          setShowCustomerEntryModal(false)
          if (typeof refreshMe === "function") refreshMe()
        }}
      />
    </div>
  )
}

const INDIVIDUAL_SERVICES = {
  hvac: [
    { id: "ind-hvac-1", name: "AC Inspection & Diagnosis", price: 299, priceStr: "₹299", duration: "45 mins", categoryType: "Repair", includes: ["Complete 21-point checkup", "Cooling & gas pressure check", "Detailed estimate report"], image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=600&q=80&fit=crop" },
    { id: "ind-hvac-2", name: "AC Gas Leakage Fix & Refill", price: 1499, priceStr: "₹1,499", duration: "1.5 hrs", categoryType: "Repair", includes: ["Nitrogen leak testing", "Copper pipe brazing fix", "Full Freon gas recharge"], image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80&fit=crop" },
    { id: "ind-hvac-3", name: "AC Split Wall Installation", price: 1299, priceStr: "₹1,299", duration: "2 hrs", categoryType: "Install", includes: ["Indoor & outdoor unit mounting", "Copper pipe vacuuming", "Performance testing"], image: "https://images.unsplash.com/photo-1610486842247-7505ed272fc4?w=600&q=80&fit=crop" },
    { id: "ind-hvac-4", name: "AC Uninstallation Service", price: 699, priceStr: "₹699", duration: "1 hr", categoryType: "Install", includes: ["Safe gas pump down", "Dismantling indoor & outdoor units", "Packing copper pipes"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop" },
  ],
  electrical: [
    { id: "ind-elec-1", name: "Switch & Socket Installation", price: 149, priceStr: "₹149", duration: "30 mins", categoryType: "Install", includes: ["Replacement or new socket fitting", "Safety testing after install", "30-day service warranty"], image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80&fit=crop" },
    { id: "ind-elec-2", name: "Ceiling Fan Repair / Fitting", price: 249, priceStr: "₹249", duration: "45 mins", categoryType: "Repair", includes: ["Regulator & capacitor fix", "Noise & speed troubleshooting", "Blade alignment & mounting"], image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=600&q=80&fit=crop" },
    { id: "ind-elec-3", name: "MCB Breaker Replacement", price: 399, priceStr: "₹399", duration: "45 mins", categoryType: "Repair", includes: ["Tripping & overload diagnosis", "Single/Double pole MCB fix", "Distribution board testing"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&q=80&fit=crop" },
    { id: "ind-elec-4", name: "Complete Room Wiring Check", price: 699, priceStr: "₹699", duration: "1.5 hrs", categoryType: "Repair", includes: ["Earthing & voltage check", "Heavy appliance load testing", "Short circuit safety report"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop" },
  ],
  plumbing: [
    { id: "ind-plum-1", name: "Tap & Faucet Repair", price: 149, priceStr: "₹149", duration: "30 mins", categoryType: "Repair", includes: ["Washer & spindle replacement", "Leakage & drip fix", "Water flow optimization"], image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&q=80&fit=crop" },
    { id: "ind-plum-2", name: "Sink & Drain Unclogging", price: 349, priceStr: "₹349", duration: "45 mins", categoryType: "Repair", includes: ["Waste pipe cleaning", "Clog removal using spring wire", "Water flow check"], image: "https://images.unsplash.com/photo-1607472586893-edb57cb3b4e1?w=600&q=80&fit=crop" },
    { id: "ind-plum-3", name: "Flush Tank & Toilet Fix", price: 499, priceStr: "₹499", duration: "1 hr", categoryType: "Repair", includes: ["Syphon kit & ball valve fix", "Flush tank leak repair", "Sanitary seal check"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop" },
    { id: "ind-plum-4", name: "Geyser Water Heater Install", price: 799, priceStr: "₹799", duration: "1.5 hrs", categoryType: "Install", includes: ["Wall mounting & inlet/outlet pipes", "Thermostat & element safety test", "Demo & leak check"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80&fit=crop" },
  ],
  cleaning: [
    { id: "ind-clean-1", name: "Bathroom Deep Cleaning", price: 499, priceStr: "₹499", duration: "1.5 hrs", categoryType: "Repair", includes: ["Hard water stain removal", "Tile & grout scrubbing", "Sanitization of toilet & sink"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80&fit=crop" },
    { id: "ind-clean-2", name: "Kitchen Deep Cleaning", price: 999, priceStr: "₹999", duration: "2 hrs", categoryType: "Repair", includes: ["Chimney exterior degreasing", "Countertop & tile scrubbing", "Cabinet exterior wipe"], image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80&fit=crop" },
    { id: "ind-clean-3", name: "Sofa Vacuuming & Polish", price: 799, priceStr: "₹799", duration: "1.5 hrs", categoryType: "Repair", includes: ["Fabric shampooing & extraction", "Dust mite & stain removal", "Fabric freshener spray"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop" },
    { id: "ind-clean-4", name: "Balcony & Window Wash", price: 399, priceStr: "₹399", duration: "1 hr", categoryType: "Install", includes: ["Glass panel streak-free clean", "Grille & ledge wiping", "Floor scrubbing"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&fit=crop" },
  ],
};

export function ServiceDetailSideDrawer({ item, category, cart, setCart, onClose }) {
  if (!item) return null;

  const getCartCount = (itemId) => {
    const found = cart.find(c => c.id === itemId);
    return found ? found.quantity : 0;
  };

  const addToCart = (pkg) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === pkg.id);
      if (existing) {
        return prev.map(c => c.id === pkg.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...pkg, quantity: 1, categoryName: category?.name || "Service" }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(c => c.id !== itemId);
      }
      return prev.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  return (
    <motion.div
      className="absolute inset-0 z-50 bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ type: "spring", damping: 28, stiffness: 350 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header Navigation */}
      <div className="bg-slate-900 text-white p-3 sm:p-4 flex items-center justify-between shrink-0 shadow-md">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-black text-white hover:text-amber-300 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Services</span>
        </button>
        <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider hidden sm:block">
          {category?.name || "Service Details"}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Hero Header */}
      <div className="relative h-44 bg-slate-950 shrink-0">
        <img
          src={item.image || category?.image || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80&fit=crop"}
          alt={item.name}
          className="w-full h-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {category?.name || "Service Details"}
            </span>
            <div className="flex items-center gap-1 bg-amber-500/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-amber-300 text-xs font-bold border border-amber-400/30">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>4.8</span>
              <span className="text-slate-300 text-[10px] font-medium ml-0.5">(113K reviews)</span>
            </div>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">{item.name}</h3>
          <p className="text-sm text-slate-200 mt-1 font-semibold">
            Starts at <span className="font-extrabold text-amber-300 text-base">{item.priceStr || ("₹" + item.price)}</span> • {item.duration || "1 hr"}
          </p>
        </div>
      </div>

      {/* Scrollable Drawer Content */}
      <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800 bg-white">
        <div>
          <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-base">🛠️</span>
            <span>How Our Technician Works</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>🔍</span> Step 1: Diagnosis
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">Uniformed expert performs 21-point safety & operational checkup.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>🛠️</span> Step 2: Professional Repair
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">Uses specialized tools & genuine company-backed spare parts.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>🧹</span> Step 3: Cleanup & Test
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">Cleans up work area completely & tests appliance performance.</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="font-extrabold text-slate-900 mb-1 flex items-center gap-1.5">
                <span>🛡️</span> Step 4: Digital Bill & Warranty
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">Issues digital invoice with 30-day free revisit cover guarantee.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="font-black text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="text-indigo-600 font-extrabold">✓</span>
              <span>Included Services</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
              {(item.includes || ["Diagnosis & Labour", "30-day warranty"]).map(inc => (
                <li key={inc} className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold text-sm leading-none">✓</span>
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4">
            <div className="font-black text-xs text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="text-rose-600 font-extrabold">✕</span>
              <span>Excluded Services</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-1.5">
                <span className="text-rose-500 font-bold text-sm leading-none">✕</span>
                <span>Spare parts cost (charged as per standard rate card)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="space-y-0.5">
            <div className="font-extrabold text-sm flex items-center gap-1.5">
              <span>🛡️</span>
              <span>30-Day Re-service Guarantee Included</span>
            </div>
            <p className="text-xs text-slate-300">Free revisit if any issue reoccurs within 30 days of service.</p>
          </div>
          <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            100% Covered
          </span>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
        <div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Service Price</div>
          <div className="text-lg font-black text-slate-900">{item.priceStr || ("₹" + item.price)}</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          {getCartCount(item.id) > 0 ? (
            <div className="flex items-center gap-2.5 bg-slate-900 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md">
              <button className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-800 flex items-center justify-center font-black" onClick={() => removeFromCart(item.id)}>-</button>
              <span>{getCartCount(item.id)} in Cart</span>
              <button className="w-6 h-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center font-black" onClick={() => addToCart(item)}>+</button>
            </div>
          ) : (
            <button
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md uppercase tracking-wider active:scale-95 cursor-pointer flex items-center gap-1.5"
              onClick={() => addToCart(item)}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}


const PAINTING_DETAILS_EXTRA = {
  "paint-interior": {
    reviews: [
      { name: "Aranya S.", rating: 5.0, comment: "The painters were highly professional. They completed the work on time with superb masking and protection for my furniture. Clean cleanup afterwards!" },
      { name: "Rahul K.", rating: 4.8, comment: "Good service for home interior wall painting. The team was quick and standard finish paint quality was excellent." }
    ],
    faqs: [
      { q: "Will the painters cover and protect the furniture?", a: "Yes, complete masking and covering of furniture, electronics, and floors with plastic sheets is included." },
      { q: "Do I need to clean the house after the painting is done?", a: "No, our team handles all post-painting cleanup, including paint splatters and vacuuming." },
      { q: "What paint brands do you use?", a: "We use premium quality paints from Asian Paints, Berger, and Nerolac based on your selection." }
    ]
  },
  "paint-exterior": {
    reviews: [
      { name: "Vikram M.", rating: 4.9, comment: "Superb exterior painting. They did excellent crack filling and high pressure washing before applying the weathercoat. Very satisfied!" },
      { name: "Sneha R.", rating: 4.7, comment: "Very professional scaffolding work and paint job. The dust-resistant paint looks wonderful on our building." }
    ],
    faqs: [
      { q: "Is scaffolding included in the package?", a: "Yes, standard scaffolding is included for up to three floors. Higher floors may incur additional safety setup fees." },
      { q: "How do you handle cracks on the outer walls?", a: "We fill exterior cracks with high-grade weather defense sealant and apply anti-fungal primer before painting." },
      { q: "How long does exterior painting last?", a: "Our premium exterior weather coat packages come with a 3-year durability warranty." }
    ]
  },
  "paint-waterproofing": {
    reviews: [
      { name: "Amit P.", rating: 4.8, comment: "Resolved our bathroom wall seepage problem. They detected the leakage source using a thermal scanner and sealed it." },
      { name: "Deepa S.", rating: 4.9, comment: "Waterproofed our terrace before the monsoon. Excellent pressure grouting work. Highly recommend!" }
    ],
    faqs: [
      { q: "Do you break the floor tiles for bathroom waterproofing?", a: "Only if the leakage source is underneath the slab. For minor joints, we do it without breaking using advanced grouting." },
      { q: "How does the warranty work?", a: "Our waterproofing treatments come with a 3-year warranty covering leakage from treated areas." },
      { q: "Is leakage source detection free?", a: "Yes, leakage scan and source mapping is included in the ₹49 inspection visit." }
    ]
  },
  "paint-wood-metal": {
    reviews: [
      { name: "Karan T.", rating: 4.8, comment: "Gave our old wooden doors a premium PU polish look. The spray finish is perfectly smooth." },
      { name: "Preeti G.", rating: 4.7, comment: "Repainted our rusted balcony grills. Excellent mechanical sanding and anti-rust coating." }
    ],
    faqs: [
      { q: "Do you repair broken wooden parts?", a: "No, carpentry repairs or wood replacement must be completed before painting begins." },
      { q: "What is the difference between PU polish and normal enamel?", a: "PU polish retains the natural wood grains with a premium finish, while enamel is an opaque protective color coat." },
      { q: "How do you prevent grill rust from returning?", a: "We scrape existing rust mechanically, apply a specialized anti-corrosion primer, and cover with double coat enamel." }
    ]
  },
  "paint-texture": {
    reviews: [
      { name: "Neha V.", rating: 4.9, comment: "The metallic accent wall looks absolutely stunning in our living room. Excellent craftsmanship." },
      { name: "Rajesh L.", rating: 4.8, comment: "Highly creative designer textures. The team helped us choose the best stencil pattern matching our decor." }
    ],
    faqs: [
      { q: "Is texture paint applied to all walls?", a: "No, texture paint is typically applied to a single accent/focal wall to highlight the room." },
      { q: "Can I customize the stencil design?", a: "Yes, our catalog has various stencil patterns. You can select your preferred style during consultation." },
      { q: "Are texture paints washable?", a: "Yes, all our premium designer texture paints have high washability." }
    ]
  }
};

export function PaintingPackageModal({ category, cart, setCart, onClose, onCheckout, onGetEstimate }) {
  const [showPriceList, setShowPriceList] = React.useState(false);
  const [selectedPaintType, setSelectedPaintType] = React.useState('premium-emulsion');
  const [searchQuery, setSearchQuery] = useState("")
  const [expanded, setExpanded] = useState({})
  const [activeDetailService, setActiveDetailService] = useState(null)
  const [showLocSearchModal, setShowLocSearchModal] = useState(false)
  const [paintLocation, setPaintLocation] = useState(() => localStorage.getItem("calservice_user_location") || "Hosur, Tamil Nadu")
  const [paintSearchRotateIdx, setPaintSearchRotateIdx] = useState(0)
  const [expandedFaq, setExpandedFaq] = React.useState(null)
  const { user } = useAuth();
  const navigate = useNavigate();
  const PAINT_SEARCH_HINTS = ["Interior Painting", "Exterior Painting", "Waterproofing", "Wood Polish", "Texture Finish"];
  useEffect(() => {
    const t = setInterval(() => setPaintSearchRotateIdx(i => (i + 1) % PAINT_SEARCH_HINTS.length), 2800);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    setExpandedFaq(null);
  }, [activeDetailService]);

  const getSubOptionDescription = (id, serviceName) => {
    switch (id) {
      case "int-single-wall": return "Inspection of one focus wall, moisture checking, and measurement.";
      case "int-one-room": return "Measurement and putty/paint assessment for a single room.";
      case "int-multi-room": return "Comprehensive consultation for two or more rooms.";
      case "int-full-home": return "Complete house painting assessment including all walls and ceilings.";
      case "int-ceiling": return "Ceiling inspection, leakage check, and measurement.";

      case "ext-wall": return "Exterior wall check, cracks checking, and pressure wash assessment.";
      case "ext-building": return "Full building external paint assessment and safety review.";
      case "ext-compound": return "Compound wall length measurement and weather-coat suggestions.";
      case "ext-terrace": return "Terrace floor assessment and heat-resistant paint options.";

      case "wp-terrace": return "Terrace leakage detection, mapping, and joint water testing.";
      case "wp-bathroom": return "Bathroom floor and wall tile joint inspection for moisture.";
      case "wp-wall": return "Moisture meter check of internal damp walls and leakage source detection.";
      case "wp-roof": return "Roof slab checking, crack width testing, and protective coating assessment.";
      case "wp-crack": return "Identification of structural/hairline cracks and sealant suggestions.";

      case "wm-doors": return "Wooden/metal doors surface rust check, sanding estimation.";
      case "wm-windows": return "Window grill and frame surface protection check.";
      case "wm-grills": return "Balcony/staircase grills rust removal and paint planning.";
      case "wm-cabinets": return "Kitchen or bedroom wooden cabinet wood condition review.";
      case "wm-gates": return "Main gate rust scraping and PU/enamel coat assessment.";

      case "td-texture": return "Consultation on accent wall patterns, stencils, and metallic textures.";
      case "td-designer": return "Custom high-end designs, glazes, and pattern catalog showcase.";
      case "td-stencil": return "Living room or bedroom stencil pattern consultation.";
      case "td-accent": return "Single focal wall color selection and texture mockups.";

      default: return `Assessment and digital measurement of your ${serviceName.toLowerCase()}.`;
    }
  }

  const PAINTING_SERVICES = [
    {
      id: "paint-interior",
      name: "Interior Painting",
      rating: "4.8",
      reviews: "18K",
      image: "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=800&q=80&fit=crop",
      points: [
        "Complete wall prep & putty application",
        "Double coat premium emulsion paint",
        "Detailed masking & post-cleanup protection",
        "1-Year Service Warranty"
      ],
      benefits: ["Premium Quality", "Verified Painters", "Clean Post-Service", "1-Year Warranty"],
      includes: ["Wall Putty", "Primer Application", "2 Coats Premium Emulsion Paint", "Masking & Protection", "Post-Service Cleaning", "1-Year Warranty"],
      excludes: ["Major plastering work", "Dampness treatment (available separately)", "Electrical/re-wiring work"],
      inspectionHighlights: ["Digital Wall Measurement", "Moisture Meter Inspection", "Wall Putty/Paint Damage Assessment"],
      steps: ["Select Areas", "Free Inspection", "Detailed Quote", "Design Approval", "Expert Painting"],
      subOptions: [
        { id: "int-single-wall", name: "Single Wall", price: 0 },
        { id: "int-one-room", name: "One Room", price: 0 },
        { id: "int-multi-room", name: "Two or More Rooms", price: 0 },
        { id: "int-full-home", name: "Full Home", price: 0 },
        { id: "int-ceiling", name: "Ceiling", price: 0 }
      ]
    },
    {
      id: "paint-exterior",
      name: "Exterior Painting",
      rating: "4.7",
      reviews: "15K",
      image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80&fit=crop",
      points: [
        "Pressure washing & crack filling",
        "Anti-fungal primer coat",
        "Double coat weather-defense paint",
        "Dust and dirt resistant finish"
      ],
      benefits: ["Weatherproof Shield", "Scaffolding Safety", "Crack Treatment", "3-Year Warranty"],
      includes: ["High Pressure Washing", "Sanding & Crack Filling", "Anti-Algae Exterior Primer", "2 Coats Weatherproof Paint", "Grill & Pipe Protective Coating", "Post-Service Cleaning"],
      excludes: ["Scaffolding above 3 floors (extra charges)", "Exterior waterproofing (available separately)", "Structural masonry / re-plastering"],
      inspectionHighlights: ["Façade Crack Audit", "Moisture Meter Checking", "Safety & Scaffolding Planning"],
      steps: ["Select Areas", "Free Inspection", "Wash & Crack Prep", "Weathercoat Painting", "Final Inspection"],
      subOptions: [
        { id: "ext-wall", name: "Exterior Wall", price: 0 },
        { id: "ext-building", name: "Building Exterior", price: 0 },
        { id: "ext-compound", name: "Compound Wall", price: 0 },
        { id: "ext-terrace", name: "Terrace", price: 0 }
      ]
    },
    {
      id: "paint-waterproofing",
      name: "Waterproofing",
      rating: "4.6",
      reviews: "12K",
      image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80&fit=crop",
      points: [
        "Expert Leakage Detection & Dampness Solutions",
        "Terrace, Bathroom & External Wall Waterproofing",
        "We diagnose the cause. Fix it right. Waterproofing that lasts."
      ],
      benefits: ["Leakage Proof", "Damp & Mold Proof", "Advanced Chemicals", "3-Year Warranty"],
      includes: ["Thermal Moisture Inspection", "Leakage Source Detection", "Terrace Joint Waterproofing", "Bathroom Wall Joint Treatment", "Pressure Grouting", "Structural Crack Filling"],
      excludes: ["Re-tiling charges (if floor tile needs to be broken)", "Major concrete reconstruction", "Plumbing piping re-routing"],
      inspectionHighlights: ["Moisture Meter Scan", "Leakage Trace Mapping", "Wall/Ceiling Dampness Audit"],
      steps: ["Inspect & Scan", "Detect Leakage Source", "Seal Cracks & Grout", "Apply Waterproof Barrier", "Water Tightness Test"],
      subOptions: [
        { id: "wp-terrace", name: "Terrace Waterproofing", price: 0 },
        { id: "wp-bathroom", name: "Bathroom Waterproofing", price: 0 },
        { id: "wp-wall", name: "Wall Waterproofing", price: 0 },
        { id: "wp-roof", name: "Roof Waterproofing", price: 0 },
        { id: "wp-crack", name: "Crack Filling", price: 0 }
      ]
    },
    {
      id: "paint-wood-metal",
      name: "Wood & Metal Painting",
      rating: "4.7",
      reviews: "9K",
      image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&q=80&fit=crop",
      points: [
        "Rust removal & sanding treatment",
        "Specialized wood/metal primer application",
        "PU coating or premium enamel paint",
        "High gloss or sophisticated matte finish"
      ],
      benefits: ["Anti-Rust Shield", "Premium Wood Polish", "High Gloss Spray Finish", "Durability Guarantee"],
      includes: ["Rust Scraping & Mechanical Sanding", "Wood Sanding & Filler", "Metal Anti-Corrosion Primer", "Wood Base Primer", "2 Coats PU or Enamel Paint", "Finishing Selection (Gloss/Matte)"],
      excludes: ["New wood carving or carpentry repairs", "Replacement of broken wood sections", "Glass frame replacements"],
      inspectionHighlights: ["Rust Depth Measurement", "Wood Termite/Rot Inspection", "Measurement of Grills/Doors"],
      steps: ["Select Items", "Sanding & Scraping", "Apply Protection Primer", "PU Polish / Enamel Paint", "Final Quality Polish"],
      subOptions: [
        { id: "wm-doors", name: "Doors", price: 0 },
        { id: "wm-windows", name: "Windows", price: 0 },
        { id: "wm-grills", name: "Grills", price: 0 },
        { id: "wm-cabinets", name: "Cabinets", price: 0 },
        { id: "wm-gates", name: "Gates", price: 0 }
      ]
    },
    {
      id: "paint-texture",
      name: "Texture & Decorative Painting",
      rating: "4.8",
      reviews: "8K",
      image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80&fit=crop",
      points: [
        "Specialty textured finishes & stencils",
        "Premium metallic & non-metallic glazes",
        "Vibrant accent wall styling consultation"
      ],
      benefits: ["Accent Metallic Wall", "Custom Stencil Designs", "Textured Accent Finish", "Designer Showcase"],
      includes: ["Texture / Pattern Consultation", "Accent Wall Preparation", "Premium Metallic Pattern Painting", "Custom Stencil Painting", "Post-Service Clean-up"],
      excludes: ["Full room plain painting (available separately)", "Wallpaper scraping/removal", "Plaster board reconstruction"],
      inspectionHighlights: ["Texture Catalog Consultation", "Accent Wall Surface Suitability Check", "Wall Size & Lighting Review"],
      steps: ["Select Designer Theme", "Wall Surface Preparation", "Apply Base Coating", "Create Textured Finish", "Accent Highlights Finish"],
      subOptions: [
        { id: "td-texture", name: "Texture Finish", price: 0 },
        { id: "td-designer", name: "Designer Finish", price: 0 },
        { id: "td-stencil", name: "Stencil Decor", price: 0 },
        { id: "td-accent", name: "Accent Wall Painting", price: 0 }
      ]
    }
  ];

  const cardRefs = {
    "paint-interior": useRef(null),
    "paint-exterior": useRef(null),
    "paint-waterproofing": useRef(null),
    "paint-wood-metal": useRef(null),
    "paint-texture": useRef(null),
  }

  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  const scrollToCard = (id) => {
    const card = cardRefs[id]?.current;
    if (!card) return;
    const container = contentRef.current;
    if (!container) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // Get card top relative to the scroll container
    const cardTop = card.getBoundingClientRect().top;
    const containerTop = container.getBoundingClientRect().top;
    const offset = cardTop - containerTop + container.scrollTop - 16; // 16px breathing room
    container.scrollTo({ top: offset, behavior: 'smooth' });
  }

  const addToCart = (pkg) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === pkg.id);
      if (existing) {
        return prev.map(c => c.id === pkg.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...pkg, quantity: 1, categoryName: "Painting" }];
    });
  }

  const removeFromCart = (pkgId) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === pkgId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(c => c.id !== pkgId);
      }
      return prev.map(c => c.id === pkgId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  const getCartCount = (pkgId) => {
    const item = cart.find(c => c.id === pkgId);
    return item ? item.quantity : 0;
  }

  const addSubOptionToCart = (subOpt, parentService) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === subOpt.id);
      if (existing) {
        return prev.map(c => c.id === subOpt.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        id: subOpt.id,
        name: `${parentService.name}: ${subOpt.name}`,
        shortName: subOpt.name,
        price: subOpt.price,
        parentId: parentService.id,
        parentName: parentService.name,
        quantity: 1,
        categoryName: "Painting"
      }];
    });
  }

  const removeSubOptionFromCart = (subOptId) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === subOptId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(c => c.id !== subOptId);
      }
      return prev.map(c => c.id === subOptId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  const getSubOptionCartCount = (subOptId) => {
    const item = cart.find(c => c.id === subOptId);
    return item ? item.quantity : 0;
  }

  const getParentCartCount = (parentId) => {
    return cart.reduce((sum, item) => item.parentId === parentId ? sum + item.quantity : sum, 0);
  }

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getSearchKeywords = (serviceId) => {
    switch (serviceId) {
      case "paint-interior":
        return ["interior", "wall", "room", "house", "home", "inside", "ceiling", "putty", "paint", "painting"];
      case "paint-exterior":
        return ["exterior", "outside", "building", "facade", "compound", "terrace", "paint", "painting"];
      case "paint-waterproofing":
        return ["water", "proof", "proofing", "proffing", "profing", "leak", "damp", "wet", "rain", "moisture", "crack", "roof", "bathroom", "waterproofing"];
      case "paint-wood-metal":
        return ["wood", "metal", "door", "window", "grill", "gate", "polish", "enamel", "rust", "sanding", "cabinet", "paint", "painting"];
      case "paint-texture":
        return ["texture", "decor", "design", "stencil", "accent", "metallic", "glaze", "pattern", "paint", "painting"];
      default:
        return [];
    }
  };

  const filteredServices = searchQuery
    ? PAINTING_SERVICES.filter(s => {
      try {
        const queryLower = searchQuery.toLowerCase().trim();
        if (!queryLower) return true;
        const words = queryLower.split(/\s+/);

        const exactMatch = (s.name && s.name.toLowerCase().includes(queryLower)) ||
          (s.points && s.points.some(p => p && p.toLowerCase().includes(queryLower))) ||
          (s.includes && s.includes.some(inc => inc && inc.toLowerCase().includes(queryLower)));
        if (exactMatch) return true;

        const keywords = getSearchKeywords(s.id);
        if (keywords && keywords.length > 0) {
          return words.some(word =>
            keywords.some(kw => kw && (kw.includes(word) || word.includes(kw)))
          );
        }
        return false;
      } catch (err) {
        console.error("Error in search filter:", err);
        const queryLower = searchQuery.toLowerCase().trim();
        return s.name && s.name.toLowerCase().includes(queryLower);
      }
    })
    : PAINTING_SERVICES;

  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="uc-paint-overlay" onClick={onClose}>
      <motion.div
        className="uc-paint-modal"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
      >


        {/* Urban Style Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

            {/* Left: Logo + divider + Location Pill */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Logo */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={onClose}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
                  <Home size={15} strokeWidth={2.5} className="text-white" />
                </div>
                <span className="text-sm font-black text-slate-900 hidden sm:block">
                  <span className="text-teal-600">Cal</span>Services
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* Location Selector Pill */}
              <button
                type="button"
                onClick={() => setShowLocSearchModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-white text-xs font-extrabold text-slate-800 transition-all cursor-pointer shadow-sm max-w-[180px] sm:max-w-[260px] truncate"
                title="Select Location"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{paintLocation}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
              </button>
            </div>

            {/* Center: Animated Search Bar */}
            <div className="relative max-w-[300px] w-full hidden sm:block">
              <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-teal-500 rounded-xl px-3 py-2 shadow-sm transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                <div className="relative flex-1 flex items-center min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none z-10"
                  />
                  {!searchQuery && (
                    <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden select-none">
                      <span className="text-xs font-medium text-slate-400 mr-1 shrink-0">Search for</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={paintSearchRotateIdx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="text-xs font-bold text-slate-500 truncate"
                        >
                          '{PAINT_SEARCH_HINTS[paintSearchRotateIdx]}'...
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1 shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Location Search Modal */}
        {showLocSearchModal && (
          <AddAddressSearchModal
            onClose={() => setShowLocSearchModal(false)}
            onSelectLocation={(loc) => {
              setShowLocSearchModal(false);
              if (loc) { setPaintLocation(loc); localStorage.setItem("calservice_user_location", loc); }
            }}
            onUseCurrentLocation={() => {
              setShowLocSearchModal(false);
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                  try {
                    const res = await fetch(`https://photon.komoot.io/reverse?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`);
                    const data = await res.json();
                    if (data?.features?.[0]?.properties) {
                      const p = data.features[0].properties;
                      const display = [p.name, p.street, p.city, p.state].filter(Boolean).slice(0, 2).join(", ");
                      if (display) { setPaintLocation(display); localStorage.setItem("calservice_user_location", display); }
                    }
                  } catch (e) { }
                });
              }
            }}
          />
        )}

        {/* Fixed Horizontal Sub-Navigation Tab bar (outside scroll container) */}
        <div className="uc-paint-horizontal-nav">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 pb-2 pt-1 border-b border-slate-100">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <ChevronLeft size={16} /> Back to Services
              </button>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {category?.name || "Painting Services"}
              </h2>
            </div>
            <div className="uc-paint-horizontal-nav-list" style={{ justifyContent: "flex-start", margin: 0, padding: "8px 0" }}>
              <button className="uc-paint-tab-btn" onClick={() => scrollToCard("paint-interior")}>
                <img
                  className="uc-paint-tab-img"
                  src="https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=150&auto=format&fit=crop&q=60"
                  alt="Interior Painting"
                  onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=150&auto=format&fit=crop&q=60"; }}
                />
                <span className="uc-paint-tab-label">Interior Painting</span>
              </button>
              <button className="uc-paint-tab-btn" onClick={() => scrollToCard("paint-exterior")}>
                <img
                  className="uc-paint-tab-img"
                  src="https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=150&auto=format&fit=crop&q=60"
                  alt="Exterior Painting"
                  onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=150&auto=format&fit=crop&q=60"; }}
                />
                <span className="uc-paint-tab-label">Exterior Painting</span>
              </button>
              <button className="uc-paint-tab-btn" onClick={() => scrollToCard("paint-waterproofing")}>
                <img
                  className="uc-paint-tab-img"
                  src="https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=150&auto=format&fit=crop&q=60"
                  alt="Waterproofing"
                  onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=150&auto=format&fit=crop&q=60"; }}
                />
                <span className="uc-paint-tab-label">Waterproofing</span>
              </button>
              <button className="uc-paint-tab-btn" onClick={() => scrollToCard("paint-wood-metal")}>
                <img
                  className="uc-paint-tab-img"
                  src="https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=150&auto=format&fit=crop&q=60"
                  alt="Wood & Metal"
                  onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=150&auto=format&fit=crop&q=60"; }}
                />
                <span className="uc-paint-tab-label">Wood & Metal</span>
              </button>
              <button className="uc-paint-tab-btn" onClick={() => scrollToCard("paint-texture")}>
                <img
                  className="uc-paint-tab-img"
                  src="https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=150&auto=format&fit=crop&q=60"
                  alt="Texture Decor"
                  onError={e => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=150&auto=format&fit=crop&q=60"; }}
                />
                <span className="uc-paint-tab-label">Texture Decor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content - ONLY this div scrolls */}
        <div className="uc-paint-content" ref={contentRef}>
          <div className="uc-paint-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Title & Rating */}
            <div className="uc-paint-hero-row">
              <h2 className="uc-paint-sidebar-title">Painting Services</h2>
              <div className="uc-paint-sidebar-rating">
                <Star size={14} style={{ fill: "#fbbf24", color: "#fbbf24" }} />
                <span>4.8 (Highly Rated by 2.5 Lakh+ Customers)</span>
              </div>
            </div>

            <div className="uc-paint-main-layout">
              {/* Middle Column - Service Choices Cards */}
              <div className="uc-paint-middle-col">
                <div className="uc-paint-choices">
                  


                  <h3 className="uc-paint-section-title">Painting choices for your home</h3>
                  <div className="uc-paint-list">
                    {filteredServices.map(service => {
                      const isExpanded = !!expanded[service.id];
                      const count = getCartCount(service.id);
                      return (
                        <div key={service.id} className="uc-paint-card" ref={cardRefs[service.id]}>
                          <div className="uc-paint-card-img-box">
                            <img
                              src={service.image}
                              alt={service.name}
                              onError={e => {
                                e.target.onerror = null;
                                e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=800&q=80&fit=crop";
                              }}
                            />
                            <div className="uc-paint-card-img-overlay">
                              <h4 className="uc-paint-card-overlay-title">{service.name}</h4>
                              <div className="uc-paint-card-overlay-rating">
                                <Star size={12} style={{ fill: "#fbbf24", color: "#fbbf24", marginRight: 2 }} />
                                <span>{service.rating} ({service.reviews})</span>
                              </div>
                            </div>
                          </div>
                          <div className="uc-paint-card-body">
                            <ul className="uc-paint-points">
                              {service.points.map((p, idx) => (
                                <li key={idx} className="uc-paint-point-item">
                                  <span className="uc-paint-point-check">✓</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem' }}>
                              <button
                                onClick={() => setActiveDetailService(service)}
                                style={{
                                  background: 'none', border: 'none',
                                  color: '#7C3AED', fontWeight: 800, fontSize: '0.85rem',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                                  gap: '2px', padding: 0
                                }}
                              >
                                View details <ChevronRight size={14} />
                              </button>
                              <button
                                className="uc-paint-action-btn"
                                onClick={() => {
                                  if (onGetEstimate) {
                                    onGetEstimate();
                                  } else {
                                    onCheckout();
                                  }
                                }}
                                style={{ padding: '0.5rem 1.4rem', fontSize: '0.8rem' }}
                              >
                                GET ESTIMATE ₹49
                              </button>
                            </div>

                            {getParentCartCount(service.id) > 0 && (
                              <div className="uc-paint-card-footer" style={{ borderTop: '1px solid #f1f5f9', marginTop: '1rem', paddingTop: '0.75rem' }}>
                                <div className="uc-paint-card-price" style={{ textAlign: 'center', width: '100%' }}>
                                  <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 800 }}>
                                    ✓ {getParentCartCount(service.id)} area(s) selected for site visit
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredServices.length === 0 && (
                      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
                        <Search size={32} style={{ margin: "0 auto 0.75rem", color: "#cbd5e1" }} />
                        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>No painting services match your search.</p>
                      </div>
                    )}
                  </div>

                  {/* CalServices vs Local Vendor Comparison Table */}
                  <div className="uc-paint-comparison-section" style={{ margin: "2rem 0", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                    <div style={{ padding: "1.25rem 1.5rem 0.75rem", borderBottom: "1px solid #f1f5f9" }}>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", textAlign: "left" }}>Why choose CalServices Painting?</h3>
                      <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b", textAlign: "left" }}>See how CalServices compares to typical local vendor services.</p>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 800, color: "#475569", width: "40%", borderRight: "2px solid #34d399" }}>Services</th>
                            <th style={{
                              padding: "1rem", textAlign: "center", fontSize: "0.85rem", fontWeight: 900,
                              color: "#0d9488", background: "#f0fdf4", width: "30%", borderLeft: "2px solid #34d399", borderRight: "2px solid #34d399"
                            }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <span style={{ color: "#0f172a", fontWeight: 900, letterSpacing: "0.02em" }}>CAL<span style={{ color: "#0d9488" }}>services</span></span>
                              </div>
                            </th>
                            <th style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", fontWeight: 800, color: "#64748b", width: "30%", borderLeft: "2px solid #34d399" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                <User size={15} style={{ color: "#8b5cf6" }} />
                                <span>Local Vendor</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { title: "100% Original Paint Brands", desc: "Genuine paints like Asian Paints or Berger." },
                            { title: "Scientific Wall Moisture Test", desc: "We check walls before painting to prevent peeling." },
                            { title: "Fixed Pricing (No Hidden Fees)", desc: "Paint & labor cost is completely included upfront." },
                            { title: "Expert Trained Painters", desc: "Done by professional, verified painters." },
                            { title: "Full Masking & Protection", desc: "We cover all furniture, floors, and switches safely." },
                            { title: "Spotless Post-Paint Cleaning", desc: "Your home is left neat, tidy, and clean." },
                            { title: "Damage Insurance up to ₹10,000", desc: "Free protection if anything gets accidentally damaged." },
                            { title: "1-Year Peeling Warranty", desc: "Full service warranty against peeling or bubbling." }
                          ].map((row, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 700, color: "#334155", textAlign: "left", borderRight: "2px solid #34d399" }}>
                                <span style={{ marginRight: "6px", color: "#94a3b8" }}>•</span>
                                <span style={{ fontWeight: 800, color: "#1e293b" }}>{row.title}</span>
                                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>{row.desc}</div>
                              </td>
                              <td style={{
                                padding: "0.85rem 1rem", textAlign: "center", background: "#f0fdf4",
                                borderLeft: "2px solid #34d399", borderRight: "2px solid #34d399"
                              }}>
                                <Check size={16} strokeWidth={3} style={{ color: "#10b981", margin: "0 auto" }} />
                              </td>
                              <td style={{ padding: "0.85rem 1rem", textAlign: "center", borderLeft: "2px solid #34d399" }}>
                                <X size={16} strokeWidth={2.5} style={{ color: "#ef4444", margin: "0 auto" }} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Get Estimate Banner */}
                  <div className="uc-paint-estimate-banner">
                    <div className="uc-paint-estimate-left">
                      <h4 className="uc-paint-estimate-title">Get a Free Painting Consultation</h4>
                      <ul className="uc-paint-estimate-list">
                        <li className="uc-paint-estimate-item">
                          <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                          <span>Certified, top-tier paint brands</span>
                        </li>
                        <li className="uc-paint-estimate-item">
                          <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                          <span>Complimentary expert wall consultation</span>
                        </li>
                        <li className="uc-paint-estimate-item">
                          <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                          <span>Handled by vetted, skilled professionals</span>
                        </li>
                      </ul>
                      <button className="uc-paint-estimate-btn" onClick={() => scrollToCard("paint-interior")}>
                        Select Areas to Book
                      </button>
                    </div>
                    <div className="uc-paint-estimate-right">
                      <Calculator size={36} style={{ color: "#059669" }} />
                      <div className="uc-paint-estimate-badge">
                        <PaintRoller size={12} />
                      </div>
                    </div>
                  </div>

                  {/* How Painting Works */}
                  <div className="uc-paint-process-section">
                    <h3 className="uc-paint-process-title">How CalServices Painting Works</h3>
                    <div className="uc-paint-process-steps">
                      <div className="uc-paint-process-step">
                        <div className="uc-paint-process-icon-box" style={{ background: "#eff6ff", color: "#6366f1", boxShadow: "0 0 0 1.5px #c7d2fe" }}>
                          <Calendar size={16} color="#6366f1" />
                        </div>
                        <div className="uc-paint-process-info">
                          <span className="uc-paint-process-name">Book a Free Visit</span>
                          <span className="uc-paint-process-desc">Choose a date and time for us to check your walls.</span>
                        </div>
                      </div>
                      <div className="uc-paint-process-step">
                        <div className="uc-paint-process-icon-box" style={{ background: "#fff7ed", color: "#f59e0b", boxShadow: "0 0 0 1.5px #fde68a" }}>
                          <Cpu size={16} color="#f59e0b" />
                        </div>
                        <div className="uc-paint-process-info">
                          <span className="uc-paint-process-name">Accurate Laser Measurement</span>
                          <span className="uc-paint-process-desc">We measure your walls using laser tools to give you a perfect price.</span>
                        </div>
                      </div>
                      <div className="uc-paint-process-step">
                        <div className="uc-paint-process-icon-box" style={{ background: "#ecfdf5", color: "#10b981", boxShadow: "0 0 0 1.5px #a7f3d0" }}>
                          <PaintRoller size={16} color="#10b981" />
                        </div>
                        <div className="uc-paint-process-info">
                          <span className="uc-paint-process-name">On-Time Painting</span>
                          <span className="uc-paint-process-desc">We start on time and finish on time, guaranteed.</span>
                        </div>
                      </div>
                      <div className="uc-paint-process-step">
                        <div className="uc-paint-process-icon-box" style={{ background: "#ecfeff", color: "#06b6d4", boxShadow: "0 0 0 1.5px #a5f3fc" }}>
                          <ShieldCheck size={16} color="#06b6d4" />
                        </div>
                        <div className="uc-paint-process-info">
                          <span className="uc-paint-process-name">Clean-up & Final Check</span>
                          <span className="uc-paint-process-desc">We clean up all paint stains and check the quality of work.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column - Promise & Cart Summary */}
              <div className="uc-paint-right-col">
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                  borderRadius: '20px',
                  padding: '1.25rem 1rem',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1rem',
                  textAlign: 'left'
                }}>
                  <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '1.05rem', fontWeight: 900, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Why choose us?
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {[
                      {
                        title: "Trained Professional",
                        bg: "#faf5ff",
                        icon: (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#7c3aed" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )
                      },
                      {
                        title: "Technical Site Evaluation",
                        bg: "#f0fdf5",
                        icon: (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#0d9488" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 11 3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
                          </svg>
                        )
                      },
                      {
                        title: "Colour Consultation",
                        bg: "#fdf2f8",
                        icon: (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#db2777" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                            <path d="M12 8A4 4 0 0 1 12 16" />
                          </svg>
                        )
                      },
                      {
                        title: "Safety Protocols",
                        bg: "#fff7ed",
                        icon: (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#ea580c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="m9 12 2 2 4-4" />
                          </svg>
                        )
                      },
                      {
                        title: "Supervised Painting",
                        bg: "#eff6ff",
                        icon: (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#2563eb" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )
                      },
                      {
                        title: "Mechanized Tools",
                        bg: "#ecfdf5",
                        icon: (
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="#059669" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                          </svg>
                        )
                      }
                    ].map((item, idx) => (
                      <div key={idx} className="uc-paint-standard-card" style={{ padding: '10px 4px', gap: '4px' }}>
                        <div className="uc-paint-standard-icon-wrapper" style={{ background: item.bg, width: '36px', height: '36px' }}>
                          {item.icon}
                        </div>
                        <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1.2 }}>
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="uc-paint-cart-card">
                  <h4 className="uc-paint-cart-card-title">Your Cart</h4>
                  {cart.length === 0 ? (
                    <div>
                      <ShoppingCart className="uc-paint-empty-cart-img" style={{ color: "#94a3b8" }} />
                      <p className="uc-paint-empty-cart-text">No items in your cart</p>
                    </div>
                  ) : (
                    <div>
                      <div className="uc-paint-cart-items">
                        {cart.map(item => (
                          <div key={item.id} className="uc-paint-cart-item">
                            <div className="uc-paint-cart-item-info">
                              <span className="uc-paint-cart-item-name">
                                {item.parentId ? (
                                  <>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500, lineHeight: 1.2 }}>{item.parentName}</div>
                                    <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 700, marginTop: '2px' }}>{item.shortName}</div>
                                  </>
                                ) : (
                                  item.name
                                )}
                              </span>
                              {item.price > 0 && (
                                <span className="uc-paint-cart-item-price">{BOOKING_CURRENCY_SYMBOL}{item.price.toLocaleString()}</span>
                              )}
                            </div>
                            <div className="uc-paint-cart-item-qty">
                              <button onClick={() => item.parentId ? removeSubOptionFromCart(item.id) : removeFromCart(item.id)}>−</button>
                              <span>{item.quantity}</span>
                              <button onClick={() => item.parentId ? addSubOptionToCart({ id: item.id, name: item.shortName, price: item.price }, { id: item.parentId, name: item.parentName }) : addToCart(item)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="uc-paint-cart-subtotal">
                        <span>Site Inspection</span>
                        <span style={{ color: '#059669', fontWeight: 800 }}>FREE</span>
                      </div>
                      <button className="uc-paint-cart-checkout-btn" onClick={onCheckout}>
                        Book Free Inspection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Footers Section */}
          <div className="uc-paint-footer-section">
            {/* App Banner */}
            <div className="uc-paint-container">
              <div className="uc-paint-app-banner">
                <div className="uc-paint-app-banner-left">
                  <div className="uc-paint-app-banner-icon">
                    <Smartphone size={24} style={{ color: "#ffffff" }} />
                  </div>
                  <div className="uc-paint-app-banner-text">
                    <span className="uc-paint-app-banner-tag">Book on the go!</span>
                    <h4 className="uc-paint-app-banner-title">Download the CalServices App</h4>
                    <p className="uc-paint-app-banner-desc">Faster booking, real-time tracking & exclusive app offers.</p>
                  </div>
                </div>
                <div className="uc-paint-app-banner-right">
                  <button className="uc-paint-store-btn">Get it on Google Play</button>
                  <button className="uc-paint-store-btn" style={{ marginLeft: '1rem' }}>Download on App Store</button>
                </div>
              </div>
            </div>

            {/* Main Links Footer */}
            <div className="uc-paint-main-footer">
              <div className="uc-paint-container uc-paint-main-footer-inner">
                {/* Col 1 */}
                <div className="uc-paint-footer-col">
                  <div className="uc-paint-footer-logo-row">
                    <CalTrackLogo size={24} />
                    <span className="uc-paint-footer-brand">CalServices</span>
                  </div>
                  <p className="uc-paint-footer-brand-desc">
                    Your trusted partner for all home services. Quality you can count on.
                  </p>
                  <div className="uc-paint-footer-socials">
                    <span className="uc-paint-social-icon"><FacebookMark style={{ width: 16, height: 16 }} /></span>
                    <span className="uc-paint-social-icon"><InstagramMark style={{ width: 16, height: 16 }} /></span>
                    <span className="uc-paint-social-icon"><YoutubeMark style={{ width: 16, height: 16 }} /></span>
                    <span className="uc-paint-social-icon"><TwitterMark style={{ width: 16, height: 16 }} /></span>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="uc-paint-footer-col">
                  <h5 className="uc-paint-footer-col-title">Services</h5>
                  <ul className="uc-paint-footer-links">
                    <li>Home Services & Pest Control</li>
                    <li>Paintings</li>
                    <li>Mason</li>
                    <li>AC & Appliance</li>
                  </ul>
                </div>

                {/* Col 3 */}
                <div className="uc-paint-footer-col">
                  <h5 className="uc-paint-footer-col-title">Company</h5>
                  <ul className="uc-paint-footer-links">
                    <li>About Us</li>
                    <li>Careers</li>
                    <li>Blog</li>
                    <li>Become a Partner</li>
                  </ul>
                </div>

                {/* Col 4 */}
                <div className="uc-paint-footer-col">
                  <h5 className="uc-paint-footer-col-title">Need Help?</h5>
                  <ul className="uc-paint-footer-contact">
                    <li>
                      <Phone size={14} />
                      <span>+91 98765 43210</span>
                    </li>
                    <li>
                      <Mail size={14} />
                      <span>support@calservices.com</span>
                    </li>
                    <li>
                      <Clock size={14} />
                      <span>Mon - Sun (8 AM - 8 PM)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Cart Bar */}
        {totalQuantity > 0 && (
          <motion.div
            className="uc-paint-bottom-bar"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="uc-paint-bottom-bar-inner uc-paint-container">
              <div className="uc-paint-bottom-left">
                <span className="uc-paint-bottom-items">{totalQuantity} Area{totalQuantity > 1 ? 's' : ''} Selected</span>
                <span className="uc-paint-bottom-total">Free Site Inspection</span>
              </div>
              <button className="uc-paint-bottom-btn" onClick={onCheckout}>
                Book Free Inspection <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* View Details Pop-up Modal (Switch Board style) */}
        <AnimatePresence>
          {activeDetailService && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 11000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
            }} onClick={() => setActiveDetailService(null)}>
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 320 }}
                style={{
                  background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 460,
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  maxHeight: '85vh', overflow: 'hidden', margin: '1rem',
                  fontFamily: 'inherit'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Close icon */}
                <button
                  onClick={() => setActiveDetailService(null)}
                  style={{
                    position: 'absolute', top: 12, right: 12, width: 32, height: 32,
                    borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 10, color: '#1e293b'
                  }}
                >
                  <X size={16} />
                </button>

                {/* Hero Image */}
                <div style={{ width: '100%', height: 160, position: 'relative', flexShrink: 0 }}>
                  <img
                    src={activeDetailService.image}
                    alt={activeDetailService.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=800&q=80&fit=crop" }}
                  />
                </div>

                {/* Content Area */}
                {(() => {
                  const rating = parseFloat(activeDetailService.rating) || 4.8;
                  const rawVal = parseFloat(activeDetailService.reviews);
                  const multiplier = activeDetailService.reviews.toLowerCase().includes('k') ? 1000 : 1;
                  const total = isNaN(rawVal) ? 100 : Math.round(rawVal * multiplier);

                  let r5 = 0, r4 = 0, r3 = 0, r2 = 0, r1 = 0;
                  if (rating >= 4.7) {
                    r5 = Math.round(total * 0.88);
                    r4 = Math.round(total * 0.08);
                    r3 = Math.round(total * 0.02);
                    r2 = Math.round(total * 0.01);
                    r1 = Math.round(total * 0.01);
                  } else if (rating >= 4.5) {
                    r5 = Math.round(total * 0.78);
                    r4 = Math.round(total * 0.12);
                    r3 = Math.round(total * 0.06);
                    r2 = Math.round(total * 0.02);
                    r1 = Math.round(total * 0.02);
                  } else {
                    r5 = Math.round(total * 0.68);
                    r4 = Math.round(total * 0.18);
                    r3 = Math.round(total * 0.08);
                    r2 = Math.round(total * 0.03);
                    r1 = Math.round(total * 0.03);
                  }
                  const w5 = (r5 / total) * 100;
                  const w4 = (r4 / total) * 100;
                  const w3 = (r3 / total) * 100;
                  const w2 = (r2 / total) * 100;
                  const w1 = (r1 / total) * 100;

                  const serviceId = activeDetailService.id;
                  
                  // Define category-specific data
                  let startingRateText = "";
                  let subtitleText = "Final price depends on area, paint type & site inspection";
                  let viewListText = "View Price List →";
                  let hideListText = "Hide Price List ↑";
                  let tableHeaderType = "Paint Type";
                  
                  let priceList = [];
                  let paintTypes = [];
                  let chooseTypeTitle = "🎨 Choose Paint Type";
                  let chooseTypePlaceholder = "Select a painting area above to choose paint types & see exact price estimate.";
                  
                  if (serviceId === "paint-interior") {
                    startingRateText = "Starting from ₹7/sq.ft";
                    subtitleText = "Final price depends on area, paint type & site inspection";
                    priceList = [
                      { type: "Tractor UNO", price: "₹7/sq.ft" },
                      { type: "Tractor Emulsion", price: "₹9/sq.ft" },
                      { type: "Premium Emulsion", price: "₹15/sq.ft" },
                      { type: "Royal Luxury Emulsion", price: "₹27/sq.ft" }
                    ];
                    paintTypes = [
                      { id: "tractor-uno", name: "Tractor UNO", price: 7, type: "Economy", image: "/tractor-uno.png" },
                      { id: "tractor-emulsion", name: "Tractor Emulsion", price: 9, type: "Standard", image: "/tractor-emulsion.png" },
                      { id: "premium-emulsion", name: "Premium Emulsion", price: 15, type: "Premium", image: "/premium-emulsion.png" },
                      { id: "royal-luxury", name: "Royal Luxury Emulsion", price: 27, type: "Luxury", image: "/royal-luxury-emulsion.png" }
                    ];
                  } else if (serviceId === "paint-exterior") {
                    startingRateText = "Starting from ₹15/sq.ft";
                    subtitleText = "Final price depends on area, paint type & site inspection";
                    priceList = [
                      { type: "Economy Exterior", price: "₹15/sq.ft" },
                      { type: "Weather Protection", price: "₹20/sq.ft" },
                      { type: "Premium Exterior", price: "₹28/sq.ft" },
                      { type: "Advanced Weatherproof", price: "₹35/sq.ft" }
                    ];
                    paintTypes = [
                      { id: "economy-exterior", name: "Economy Exterior", price: 15, type: "Economy", image: "/tractor-uno.png" },
                      { id: "weather-protection", name: "Weather Protection", price: 20, type: "Standard", image: "/tractor-emulsion.png" },
                      { id: "premium-exterior", name: "Premium Exterior", price: 28, type: "Premium", image: "/premium-emulsion.png" },
                      { id: "advanced-weatherproof", name: "Advanced Weatherproof", price: 35, type: "Luxury", image: "/royal-luxury-emulsion.png" }
                    ];
                  } else if (serviceId === "paint-waterproofing") {
                    startingRateText = "Starting from ₹30/sq.ft";
                    subtitleText = "Final price after site inspection. Treatment depends heavily on the leakage problem.";
                    viewListText = "View Treatments →";
                    hideListText = "Hide Treatments ↑";
                    tableHeaderType = "Waterproofing Service";
                    priceList = [
                      { type: "Terrace Waterproofing", price: "₹45/sq.ft" },
                      { type: "Bathroom Waterproofing", price: "₹50/sq.ft" },
                      { type: "Wall Seepage Treatment", price: "₹35/sq.ft" },
                      { type: "Crack Waterproofing", price: "₹30/sq.ft" },
                      { type: "Balcony Waterproofing", price: "₹45/sq.ft" }
                    ];
                    paintTypes = [
                      { id: "crack-waterproofing", name: "Crack Waterproofing", price: 30, type: "Basic", image: "/premium-emulsion.png" },
                      { id: "wall-seepage", name: "Wall Seepage Treatment", price: 35, type: "Standard", image: "/tractor-emulsion.png" },
                      { id: "terrace-waterproofing", name: "Terrace Waterproofing", price: 45, type: "Premium", image: "/tractor-uno.png" },
                      { id: "balcony-waterproofing", name: "Balcony Waterproofing", price: 45, type: "Premium", image: "/royal-luxury-emulsion.png" },
                      { id: "bathroom-waterproofing", name: "Bathroom Waterproofing", price: 50, type: "Advanced", image: "/premium-emulsion.png" }
                    ];
                    chooseTypeTitle = "💧 Choose Treatment Type";
                    chooseTypePlaceholder = "Select a waterproof area above to choose treatment types & see exact price estimate.";
                  } else if (serviceId === "paint-wood-metal") {
                    startingRateText = "Starting from ₹25/sq.ft";
                    subtitleText = "Final price depends on area, surface condition & site inspection";
                    tableHeaderType = "Service";
                    priceList = [
                      { type: "Wooden Door Painting", price: "₹35/sq.ft" },
                      { type: "Wooden Polish", price: "₹50/sq.ft" },
                      { type: "Window Painting", price: "₹30/sq.ft" },
                      { type: "Metal Grill Painting", price: "₹25/sq.ft" },
                      { type: "Metal Gate Painting", price: "₹30/sq.ft" },
                      { type: "Enamel Finish", price: "₹35/sq.ft" }
                    ];
                    paintTypes = [
                      { id: "metal-grill", name: "Metal Grill Painting", price: 25, type: "Basic", image: "/tractor-emulsion.png" },
                      { id: "window-painting", name: "Window Painting", price: 30, type: "Basic", image: "/premium-emulsion.png" },
                      { id: "metal-gate", name: "Metal Gate Painting", price: 30, type: "Standard", image: "/tractor-uno.png" },
                      { id: "wooden-door", name: "Wooden Door Painting", price: 35, type: "Standard", image: "/royal-luxury-emulsion.png" },
                      { id: "enamel-finish", name: "Enamel Finish", price: 35, type: "Standard", image: "/premium-emulsion.png" },
                      { id: "wooden-polish", name: "Wooden Polish", price: 50, type: "Premium", image: "/royal-luxury-emulsion.png" }
                    ];
                    chooseTypeTitle = "🚪 Choose Polish/Enamel Type";
                    chooseTypePlaceholder = "Select a wood/metal item above to choose types & see exact price estimate.";
                  } else if (serviceId === "paint-texture") {
                    startingRateText = "Starting from ₹80/sq.ft";
                    subtitleText = "Final price depends on design complexity, texture type & site inspection";
                    tableHeaderType = "Texture Type";
                    priceList = [
                      { type: "Smooth Texture", price: "₹80/sq.ft" },
                      { type: "Sand Texture", price: "₹100/sq.ft" },
                      { type: "Metallic Texture", price: "₹130/sq.ft" },
                      { type: "Stone/Pebbled Texture", price: "₹170/sq.ft" },
                      { type: "Premium Designer Texture", price: "₹200/sq.ft" }
                    ];
                    paintTypes = [
                      { id: "smooth-texture", name: "Smooth Texture", price: 80, type: "Standard", image: "/tractor-uno.png" },
                      { id: "sand-texture", name: "Sand Texture", price: 100, type: "Premium", image: "/tractor-emulsion.png" },
                      { id: "metallic-texture", name: "Metallic Texture", price: 130, type: "Premium", image: "/premium-emulsion.png" },
                      { id: "stone-texture", name: "Stone/Pebbled Texture", price: 170, type: "Luxury", image: "/royal-luxury-emulsion.png" },
                      { id: "premium-designer", name: "Premium Designer Texture", price: 200, type: "Luxury", image: "/premium-emulsion.png" }
                    ];
                    chooseTypeTitle = "✨ Choose Texture Decor Type";
                    chooseTypePlaceholder = "Select a wall above to choose texture types & see exact price estimate.";
                  }

                  let subOptionsTitle = "What would you like to inspect?";
                  if (serviceId === "paint-interior" || serviceId === "paint-exterior" || serviceId === "paint-wood-metal" || serviceId === "paint-texture") {
                    subOptionsTitle = "🎨 What would you like to paint?";
                  } else if (serviceId === "paint-waterproofing") {
                    subOptionsTitle = "💧 What would you like to waterproof?";
                  }

                  return (
                    <>
                      <div style={{ padding: '1.25rem 1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Title & Rating */}
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', textAlign: 'left' }}>{activeDetailService.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginTop: 4 }}>
                            <Star size={12} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                            <span>{activeDetailService.rating} ({activeDetailService.reviews} ratings)</span>
                          </div>
                        </div>

                        <div style={{ height: '1px', background: '#f1f5f9', flexShrink: 0 }} />

                        {/* QUICK BENEFITS */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '6px',
                          marginTop: '0.2rem'
                        }}>
                          {activeDetailService.benefits.map((benefit, i) => {
                            let icon = <Award size={14} color="#0d9488" />;
                            if (benefit.toLowerCase().includes("premium") || benefit.toLowerCase().includes("accent")) icon = <Sparkles size={14} color="#b45309" />;
                            if (benefit.toLowerCase().includes("verified") || benefit.toLowerCase().includes("safety") || benefit.toLowerCase().includes("tech")) icon = <ShieldCheck size={14} color="#2563eb" />;
                            if (benefit.toLowerCase().includes("clean") || benefit.toLowerCase().includes("crack") || benefit.toLowerCase().includes("damp")) icon = <Brush size={14} color="#0d9488" />;
                            if (benefit.toLowerCase().includes("warranty") || benefit.toLowerCase().includes("durability")) icon = <ShieldCheck size={14} color="#16a34a" />;

                            return (
                              <div key={i} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyVertical: 'flex-start',
                                padding: '8px 4px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                textAlign: 'center',
                                gap: '6px'
                              }}>
                                <div style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  background: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                  flexShrink: 0
                                }}>
                                  {icon}
                                </div>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#334155', lineHeight: 1.2 }}>{benefit}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* STARTING PRICE */}
                        {priceList.length > 0 && (
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '1rem',
                            textAlign: 'left',
                            marginTop: '0.2rem'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>💰 {startingRateText}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{subtitleText}</div>
                              </div>
                              <button 
                                onClick={() => setShowPriceList(!showPriceList)}
                                style={{
                                  background: 'none', border: 'none', color: '#7C3AED', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px'
                                }}
                              >
                                {showPriceList ? hideListText : viewListText}
                              </button>
                            </div>
                            {showPriceList && (
                              <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 800 }}>
                                      <th style={{ textAlign: 'left', padding: '4px 0' }}>{tableHeaderType}</th>
                                      <th style={{ textAlign: 'right', padding: '4px 0' }}>Starting Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {priceList.map((item, idx) => (
                                      <tr key={idx} style={{ borderBottom: idx < priceList.length - 1 ? '1px dashed #f1f5f9' : 'none' }}>
                                        <td style={{ padding: '6px 0', color: '#334155', fontWeight: 700 }}>{item.type}</td>
                                        <td style={{ padding: '6px 0', textAlign: 'right', color: '#0f172a', fontWeight: 800 }}>{item.price}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* WHAT'S INCLUDED */}
                        <div style={{ textAlign: 'left', marginTop: '0.2rem' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>What's Included</h4>
                          <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.4rem', listStyleType: 'disc' }}>
                            {activeDetailService.includes.map((inc, i) => (
                              <li key={i} style={{ lineHeight: 1.4 }}>{inc}</li>
                            ))}
                          </ul>
                        </div>

                        {/* WHAT WOULD YOU LIKE TO PAINT? (Suboptions list) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                            {subOptionsTitle}
                          </h4>
                          {activeDetailService.subOptions.map(subOpt => {
                            const isSelected = getSubOptionCartCount(subOpt.id) > 0;
                            const description = getSubOptionDescription(subOpt.id, activeDetailService.name);
                            return (
                              <div
                                key={subOpt.id}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '0.85rem 0', borderBottom: '1px dashed #f1f5f9', gap: '1rem'
                                }}
                              >
                                <div style={{ flex: 1, textAlign: 'left' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{subOpt.name}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2, lineHeight: 1.3 }}>{description}</div>
                                </div>
                                <div style={{ shrink: 0 }}>
                                  {isSelected ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1.5px solid #0d9488', borderRadius: '8px', padding: '0.35rem 0.5rem', background: '#ffffff' }}>
                                      <button
                                        onClick={() => removeSubOptionFromCart(subOpt.id)}
                                        style={{ border: 'none', background: 'none', color: '#0d9488', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}
                                      >
                                        −
                                      </button>
                                      <span style={{ color: '#1e293b', fontWeight: 'extrabold', fontSize: '0.8rem', minWidth: '10px', textAlign: 'center' }}>
                                        {getSubOptionCartCount(subOpt.id)}
                                      </span>
                                      <button
                                        onClick={() => addSubOptionToCart(subOpt, activeDetailService)}
                                        style={{ border: 'none', background: 'none', color: '#0d9488', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', padding: '0 2px' }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => addSubOptionToCart(subOpt, activeDetailService)}
                                      style={{
                                        border: '1.5px solid #0d9488', borderRadius: '8px',
                                        padding: '0.35rem 1rem', background: '#ffffff', color: '#0d9488',
                                        fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s',
                                      }}
                                      onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4' }}
                                      onMouseLeave={e => { e.currentTarget.style.background = '#ffffff' }}
                                    >
                                      Add
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* CHOOSE TYPE */}
                        {paintTypes.length > 0 && (
                          (() => {
                            const selectedAreasCount = activeDetailService.subOptions.reduce((sum, opt) => sum + getSubOptionCartCount(opt.id), 0);
                            if (selectedAreasCount === 0) {
                              return null;
                            }
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                                  {chooseTypeTitle}
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                  {paintTypes.map(paint => {
                                    const isSelected = selectedPaintType === paint.id;
                                    return (
                                      <div 
                                        key={paint.id}
                                        onClick={() => setSelectedPaintType(paint.id)}
                                        style={{
                                          border: isSelected ? '2px solid #7C3AED' : '1.5px solid #e2e8f0',
                                          borderRadius: '12px',
                                          cursor: 'pointer',
                                          background: '#ffffff',
                                          boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.08)' : 'none',
                                          transition: 'all 0.2s',
                                          textAlign: 'left',
                                          position: 'relative',
                                          padding: '12px 14px'
                                        }}
                                      >
                                        {/* Checkmark Indicator */}
                                        <div style={{
                                          position: 'absolute', top: 12, right: 12,
                                          background: isSelected ? '#7C3AED' : 'rgba(0, 0, 0, 0.05)',
                                          color: isSelected ? '#ffffff' : 'transparent',
                                          width: 18, height: 18, borderRadius: '50%',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: '0.7rem', fontWeight: 'bold'
                                        }}>
                                          ✓
                                        </div>

                                        <div style={{ paddingRight: '22px' }}>
                                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                            {paint.name}
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, color: '#0d9488' }}>₹{paint.price}/sq.ft</span>
                                            <span style={{ fontSize: '0.58rem', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                                              {paint.type}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()
                        )}

                        {/* FREE SITE INSPECTION CARD */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: '0.5rem',
                          padding: '1rem', border: '1px dashed #34d399', borderRadius: '12px',
                          background: '#f0fdf4', color: '#065f46', textAlign: 'left', marginTop: '0.2rem'
                        }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} color="#059669" /> Free Site Inspection Included
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                            {activeDetailService.inspectionHighlights.map((high, i) => (
                              <span key={i} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', background: '#d1fae5', borderRadius: '6px' }}>{high}</span>
                            ))}
                          </div>
                        </div>

                        {/* WHAT'S NOT INCLUDED */}
                        <div style={{ textAlign: 'left', marginTop: '0.2rem' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>What's Not Included</h4>
                          <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem', listStyleType: 'disc' }}>
                            {activeDetailService.excludes.map((exc, i) => (
                              <li key={i} style={{ lineHeight: 1.4 }}>{exc}</li>
                            ))}
                          </ul>
                        </div>

                        {/* HOW CALTRACK WORKS */}
                        <div style={{ textAlign: 'left', marginTop: '0.2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            How {activeDetailService.name?.toLowerCase().includes("painting") ? "painting" : "waterproofing"} works
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '0.5rem' }}>
                            {[
                              {
                                title: "Book Home Inspection",
                                desc: "Tell us preferred time to book",
                                icon: <Calendar size={18} color="#6366f1" />,
                                bg: "#eff6ff",
                                border: "#c7d2fe"
                              },
                              {
                                title: "Measure & Estimate",
                                desc: "Get accurate quotes with laser measurements",
                                icon: <Calculator size={18} color="#f59e0b" />,
                                bg: "#fff7ed",
                                border: "#fde68a"
                              },
                              {
                                title: "Project Initiation",
                                desc: "Guaranteed on time project initiation and completion",
                                icon: <PaintRoller size={18} color="#10b981" />,
                                bg: "#ecfdf5",
                                border: "#a7f3d0"
                              },
                              {
                                title: "Cleaning & Quality Check",
                                desc: "Post paint cleanup and quality check",
                                icon: <CheckCircle2 size={18} color="#06b6d4" />,
                                bg: "#ecfeff",
                                border: "#a5f3fc"
                              }
                            ].map((step, i, arr) => (
                              <div key={i} style={{ display: 'flex', gap: '1rem', position: 'relative', paddingBottom: i < arr.length - 1 ? '1.5rem' : '0' }}>
                                {/* Timeline Line */}
                                {i < arr.length - 1 && (
                                  <div style={{
                                    position: 'absolute', left: '17px', top: '34px', bottom: '0',
                                    width: '2px', borderLeft: '2px dotted #cbd5e1'
                                  }} />
                                )}
                                {/* Step Icon */}
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%', background: step.bg,
                                  border: `1.5px solid ${step.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  zIndex: 2, flexShrink: 0, boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                                }}>
                                  {step.icon}
                                </div>
                                {/* Step Text */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{step.title}</span>
                                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>{step.desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* RATINGS & REVIEWS */}
                        <div style={{ textAlign: 'left', marginTop: '0.2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginBottom: '1rem' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ratings & Reviews</h4>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.25rem',
                            padding: '1rem',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            background: '#ffffff'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                              <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{rating.toFixed(2)}</span>
                              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>avg rating</span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {[
                                { star: 5, count: r5, width: w5 },
                                { star: 4, count: r4, width: w4 },
                                { star: 3, count: r3, width: w3 },
                                { star: 2, count: r2, width: w2 },
                                { star: 1, count: r1, width: w1 },
                              ].map(row => (
                                <div key={row.star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                                  <span style={{ minWidth: '20px', display: 'flex', alignItems: 'center', gap: '2px', color: '#94a3b8' }}>
                                    <Star size={11} style={{ fill: '#94a3b8', color: '#94a3b8' }} /> {row.star}
                                  </span>
                                  <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                                    <div style={{ width: `${row.width}%`, height: '100%', background: '#334155', borderRadius: '99px' }} />
                                  </div>
                                  <span style={{ minWidth: '40px', textAlign: 'right', fontSize: '0.68rem', color: '#475569' }}>{row.count.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* CUSTOMER REVIEWS LIST */}
                        {(() => {
                          const extra = PAINTING_DETAILS_EXTRA[activeDetailService?.id] || { reviews: [], faqs: [] };
                          if (extra.reviews.length === 0) return null;
                          return (
                            <div style={{ textAlign: 'left', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Reviews</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {extra.reviews.map((rev, idx) => (
                                  <div key={idx} style={{ padding: '0.75rem 1rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>{rev.name}</span>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <Star size={12} style={{ fill: '#6366f1', color: '#6366f1' }} /> {rev.rating.toFixed(1)}
                                      </span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', lineHeight: 1.3 }}>
                                      "{rev.comment}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* FREQUENTLY ASKED QUESTIONS */}
                        {(() => {
                          const extra = PAINTING_DETAILS_EXTRA[activeDetailService?.id] || { reviews: [], faqs: [] };
                          if (extra.faqs.length === 0) return null;
                          return (
                            <div style={{ textAlign: 'left', marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Frequently Asked Questions</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {extra.faqs.map((faq, idx) => {
                                  const isExpanded = expandedFaq === idx;
                                  return (
                                    <div key={idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
                                      <div 
                                        onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                                      >
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{faq.q}</span>
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#94a3b8' }}>
                                          {isExpanded ? '−' : '+'}
                                        </span>
                                      </div>
                                      {isExpanded && (
                                        <div style={{ padding: '0 1rem 0.75rem 1rem', fontSize: '0.72rem', color: '#475569', lineHeight: 1.4, borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', background: '#f8fafc' }}>
                                          {faq.a}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                      </div>{/* Fixed Get Estimate Button at bottom */}
                      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#ffffff', flexShrink: 0 }}>
                        <button
                          onClick={() => {
                            setActiveDetailService(null);
                            if (onGetEstimate) {
                              onGetEstimate();
                            } else {
                              onCheckout();
                            }
                          }}
                          style={{
                            width: '100%', padding: '0.8rem',
                            background: 'linear-gradient(135deg, #0d9488, #059669)',
                            color: 'white', border: 'none', borderRadius: 10,
                            fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(13,148,136,0.22)',
                          }}
                        >
                          Get Estimate ₹49
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const MASON_DETAILS_EXTRA = {
  "brick-new": {
    reviews: [
      { name: "Rajesh Kumar", rating: 5, comment: "Excellent brickwork! The wall alignment is absolutely perfect and strong." },
      { name: "Anitha R.", rating: 4.8, comment: "Very professional mason team. Completed the new brick boundary wall on time." }
    ],
    faqs: [
      { q: "What materials are included in the pricing?", a: "The rate covers layout, brick alignment, mortar preparation, and brick laying. Bricks, cement, and sand can be arranged by us or provided by you." },
      { q: "How long does curing take?", a: "We recommend water curing for at least 7 to 10 days to reach peak compressive strength." }
    ]
  },
  "brick-block": {
    reviews: [
      { name: "Vikram Singh", rating: 4.7, comment: "Sturdy block wall. Extremely fast execution and clean mortar joint application." },
      { name: "Suresh P.", rating: 4.9, comment: "High quality solid block laying. Very satisfied with the durability." }
    ],
    faqs: [
      { q: "Do you use solid or hollow blocks?", a: "We construct using solid or hollow concrete blocks based on structural needs and your preference." },
      { q: "Is reinforcing mesh used between block layers?", a: "Yes, we apply joint reinforcement steel mesh or wire every 3-4 courses for stability." }
    ]
  },
  "brick-repair": {
    reviews: [
      { name: "Nalini M.", rating: 4.6, comment: "Repointed the crumbling mortar of my garden wall. Looks completely restored!" },
      { name: "Karthik Raja", rating: 4.8, comment: "Replaced 15 damaged bricks in the load-bearing pillar. Fast work." }
    ],
    faqs: [
      { q: "Can you fix major structural cracks?", a: "We repair local brick/mortar damage. For major settlement cracks, we evaluate structural stability first." },
      { q: "Will the new mortar match the old wall color?", a: "We color-blend the mortar mixture as closely as possible to match the existing aged mortar." }
    ]
  },
  "plaster-new": {
    reviews: [
      { name: "Manjunath", rating: 5, comment: "Super smooth plaster finish. The painters had a very easy time painting over it." },
      { name: "Priya D.", rating: 4.8, comment: "Excellent double-coat plastering. Verticals are perfectly straight." }
    ],
    faqs: [
      { q: "What mix ratio of cement-sand is used?", a: "We use a standard 1:4 or 1:6 ratio depending on whether it is an interior wall or exterior wall." },
      { q: "Does the pricing include curing?", a: "The initial curing instruction is guided by us; active daily curing needs to be watered for 7 days." }
    ]
  },
  "plaster-dmg": {
    reviews: [
      { name: "Sundar Raj", rating: 4.7, comment: "Fixed the damp peeling plaster in my living room. Smooth and clean blending." },
      { name: "Gayathri", rating: 4.9, comment: "Excellent hollow patch repairs. No visible joints now." }
    ],
    faqs: [
      { q: "How do you treat the dampness before replastering?", a: "We chip out loose plaster, apply an anti-dampness base chemical treatment, and then patch it." },
      { q: "Will the patched area look different?", a: "We level-sand and smooth the edges so that the transition is completely seamless." }
    ]
  },
  "plaster-crack": {
    reviews: [
      { name: "Ramesh Babu", rating: 4.6, comment: "Filled three deep cracks in my hall wall. High quality epoxy grout used." },
      { name: "Deepak S.", rating: 4.8, comment: "Perfect crack sealing. The cracks have not returned even after monsoons." }
    ],
    faqs: [
      { q: "How do you ensure cracks don't reopen?", a: "We cut a V-groove, treat it with a bonding agent, fill it with fiber-reinforced polymer grout, and smooth it." },
      { q: "Is this suitable for ceiling cracks?", a: "Yes, we treat both wall cracks and roof/ceiling cracks professionally." }
    ]
  },
  "part-internal": {
    reviews: [
      { name: "Arun Prasath", rating: 5, comment: "Erected a new partition wall in our office lobby. Top-notch cement work." },
      { name: "Meena Sundar", rating: 4.8, comment: "Clean layout planning. Finished plaster is perfectly flat." }
    ],
    faqs: [
      { q: "How thick will the partition wall be?", a: "We build 4.5-inch single-brick partitions or 9-inch double-brick walls as required." },
      { q: "Is concrete anchoring used?", a: "Yes, we drill and insert dowel bars into columns and beams to tie the new wall securely." }
    ]
  },
  "part-room": {
    reviews: [
      { name: "Jeeva K.", rating: 4.9, comment: "Split our large hall into two rooms. Professional partitions and clean cleanup." },
      { name: "Sneha G.", rating: 4.8, comment: "Sturdy bricks wall partition. Perfect bedroom partition solution." }
    ],
    faqs: [
      { q: "Does this include doors/windows framing?", a: "We make cutouts and level the borders. Door/window frames and glass fittings are separate." },
      { q: "How long does a room partition take?", a: "Typically 2 to 3 days including brickwork, lintel casting, plastering, and initial setup." }
    ]
  },
  "part-half": {
    reviews: [
      { name: "Subramanian", rating: 4.7, comment: "Built a beautiful breakfast counter brick base. Level is perfectly flat." },
      { name: "Aishwarya", rating: 4.9, comment: "Perfect half-wall divider between living and dining room. Outstanding." }
    ],
    faqs: [
      { q: "What height is standard for half-walls?", a: "Typically 3 feet to 4 feet high, but we customize it completely to your layout." },
      { q: "Can we install a granite slab on top?", a: "Yes! We build structural brick/concrete supports ready to bear granite or wood slabs." }
    ]
  },
  "dem-wall": {
    reviews: [
      { name: "Hasan M.", rating: 4.8, comment: "Demolished the kitchen dividing wall safely. Supported the slab first." },
      { name: "Prakash L.", rating: 4.9, comment: "Fast and professional debris removal. Site was left fully clean." }
    ],
    faqs: [
      { q: "Is wall breaking safe for the building?", a: "We evaluate structural layout and only demolish non-load-bearing brick partitions." },
      { q: "How do you handle debris disposal?", a: "We pack and transport debris away from your premises to authorized dump zones." }
    ]
  },
  "dem-rem": {
    reviews: [
      { name: "Radha V.", rating: 4.7, comment: "Clean partition removal. No damage to surrounding walls or flooring." },
      { name: "Balaji T.", rating: 4.8, comment: "Excellent work removing our old lobby partition. Very efficient." }
    ],
    faqs: [
      { q: "Will the wall removal affect my flooring?", a: "A gap in the flooring will remain where the wall stood. We level this base with cement grout." },
      { q: "How long does it take?", a: "Usually 3 to 6 hours depending on wall thickness and block type." }
    ]
  },
  "dem-opening": {
    reviews: [
      { name: "Raja Shekhar", rating: 4.8, comment: "Created a new window opening in the bedroom wall. Very neat edges." },
      { name: "Nancy D.", rating: 4.9, comment: "Cast a proper lintel beam above the new door cutout. Extremely safe." }
    ],
    faqs: [
      { q: "Do you install a lintel support?", a: "Yes, we always insert or cast a concrete lintel beam above the opening to prevent wall settlement." },
      { q: "Can you resize an existing window?", a: "Yes, we can enlarge or reduce window/door cutouts and replaster the frame edges." }
    ]
  }
};

export function MasonPackageModal({ category, cart, setCart, onClose, onCheckout, onGetEstimate, setPhotoFile, setPhotoPreview }) {
  const [activeTab, setActiveTab] = useState("brick");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [activeDetailService, setActiveDetailService] = useState(null);
  const [showLocSearchModal, setShowLocSearchModal] = useState(false);
  const [masonLocation, setMasonLocation] = useState(() => localStorage.getItem("calservice_user_location") || "Hosur, Tamil Nadu");
  const [masonSearchRotateIdx, setMasonSearchRotateIdx] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const MASON_SEARCH_HINTS = ["Brick & Block Work", "Plastering", "Wall Partition", "House Construction", "Demolition"];
  useEffect(() => {
    const t = setInterval(() => setMasonSearchRotateIdx(i => (i + 1) % MASON_SEARCH_HINTS.length), 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setExpandedFaq(null);
  }, [activeDetailService]);

  // Questionnaire form states
  const [generalDesc, setGeneralDesc] = useState("");
  const [generalPhoto, setGeneralPhoto] = useState(null);
  const [generalPhotoPreview, setGeneralPhotoPreview] = useState(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setGeneralPhoto(file);
      setGeneralPhotoPreview(previewUrl);
      if (setPhotoFile) setPhotoFile(file);
      if (setPhotoPreview) setPhotoPreview(previewUrl);
    }
  };

  const MASON_CATEGORIES = [
    { id: "brick", name: "Brick & Block Work", icon: "🧱" },
    { id: "plastering", name: "Plastering & Wall Repair", icon: "🪣" },
    { id: "partition", name: "Wall & Partition Construction", icon: "📐" },
    { id: "demolition", name: "Wall Breaking & Demolition", icon: "🔨" }
  ];

  const MASON_SERVICES = [
    // 1. Brick & Block Work
    {
      id: "brick-new",
      catId: "brick",
      name: "Brick Wall Construction",
      price: 999,
      priceStr: "Starting from ₹999",
      duration: "Flexible",
      rating: "4.8",
      reviews: "1.2K",
      image: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=300&q=80&fit=crop",
      includes: ["Material assessment", "Wall alignment checking", "Mortar preparation", "Brick laying", "Curing guidance"],
      excludes: ["Plastering (available separately)", "Painting and structural slab work"],
      inspectionHighlights: ["Site layout measurement", "Load-bearing suitability check"],
      steps: ["Layout Planning", "Mortar Preparation", "Brick Alignment Laying", "Level Inspection", "Initial Curing"],
      desc: "Build sturdy, high-quality new brick walls using premium cement mortar."
    },
    {
      id: "brick-block",
      catId: "brick",
      name: "Block Wall Construction",
      price: 1299,
      priceStr: "Starting from ₹1,299",
      duration: "Flexible",
      rating: "4.7",
      reviews: "950",
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
      includes: ["Concrete blocks supply", "Mortar mixing & application", "Joint reinforcement check", "Block laying"],
      excludes: ["Foundation excavation", "Plastering"],
      inspectionHighlights: ["Ground leveling check", "Alignment verification"],
      steps: ["Site Prep", "Mortar Mix", "Block Laying", "Alignment Check", "Curing"],
      desc: "Solid or hollow concrete block wall construction for durability and strength."
    },
    {
      id: "brick-repair",
      catId: "brick",
      name: "Brick/Block Wall Repair",
      price: 499,
      priceStr: "Starting from ₹499",
      duration: "1-2 hrs",
      rating: "4.6",
      reviews: "1.1K",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
      includes: ["Remove damaged bricks", "Mortar repointing", "New brick replacement"],
      excludes: ["Entire wall reconstruction"],
      inspectionHighlights: ["Structural safety audit"],
      steps: ["Chipping old mortar", "Placing new bricks", "Pointing joints"],
      desc: "Repair damaged bricks, crumbling mortar joints, and patch structural wall cracks."
    },

    // 2. Plastering & Wall Repair
    {
      id: "plaster-new",
      catId: "plastering",
      name: "Wall Plastering",
      price: 499,
      priceStr: "Starting from ₹499",
      duration: "Flexible",
      rating: "4.8",
      reviews: "1.4K",
      image: "/tractor-uno.png",
      includes: ["Surface wetting", "Cement slurry coat", "Cement-sand plastering", "Screeding & leveling"],
      excludes: ["Wall putty application", "Painting"],
      inspectionHighlights: ["Alignment checks", "Moisture verification"],
      steps: ["Wetting", "Plaster coat", "Level checks", "Smoothing finish"],
      desc: "Smooth plastering for newly built brick or block walls to prepare for painting."
    },
    {
      id: "plaster-dmg",
      catId: "plastering",
      name: "Plaster Repair",
      price: 349,
      priceStr: "Starting from ₹349",
      duration: "1-2 hrs",
      rating: "4.7",
      reviews: "1.8K",
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80&fit=crop",
      includes: ["Chipping loose plaster", "Anti-dampness treatment", "Patch plastering & smoothing"],
      excludes: ["Full room plastering"],
      inspectionHighlights: ["Moisture level checks"],
      steps: ["Chipping", "Treating", "Plastering patch", "Smoothing edge"],
      desc: "Patch up specific areas of damp, peeling, or hollow plaster to restore smooth walls."
    },
    {
      id: "plaster-crack",
      catId: "plastering",
      name: "Crack Repair",
      price: 399,
      priceStr: "Starting from ₹399",
      duration: "1 hr",
      rating: "4.6",
      reviews: "3.2K",
      image: "/premium-emulsion.png",
      includes: ["V-groove crack opening", "Bonding agent application", "Epoxy/cement grout filling"],
      excludes: ["Foundation underpinning"],
      inspectionHighlights: ["Crack depth validation"],
      steps: ["Crack opening", "Cleaning", "Grouting", "Smoothing"],
      desc: "Fix structural cracks on walls using professional bonding agents and epoxy/cement grout."
    },

    // 3. Wall & Partition Construction
    {
      id: "part-internal",
      catId: "partition",
      name: "New Partition Wall",
      price: 1999,
      priceStr: "Starting from ₹1,999",
      duration: "Flexible",
      rating: "4.8",
      reviews: "780",
      image: "/tractor-emulsion.png",
      includes: ["Base anchor setup", "Internal brick/block wall building", "Plaster coat finishing"],
      excludes: ["Electrical box carving"],
      inspectionHighlights: ["Vertical alignment verification"],
      steps: ["Anchor drill", "Mortar prep", "Wall building", "Plastering"],
      desc: "Erect new internal partitioning walls for room modifications."
    },
    {
      id: "part-room",
      catId: "partition",
      name: "Room Partition",
      price: 1999,
      priceStr: "Starting from ₹1,999",
      duration: "Flexible",
      rating: "4.8",
      reviews: "950",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop",
      includes: ["Partition plan layout", "Anchor setup", "Brick/block partition walls construction"],
      excludes: ["Painting and electrical wiring"],
      inspectionHighlights: ["Floor load verification", "Alignment checks"],
      steps: ["Marking boundaries", "Layout base", "Partition brickwork", "Level checks", "Finishing"],
      desc: "Construct sturdy internal room dividers using bricks or concrete blocks."
    },
    {
      id: "part-half",
      catId: "partition",
      name: "Half-Wall Construction",
      price: 1499,
      priceStr: "Starting from ₹1,499",
      duration: "Flexible",
      rating: "4.8",
      reviews: "1.1K",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80&fit=crop",
      includes: ["Custom brick partitions", "Counter top support construction", "Breakfast counter base"],
      excludes: ["Granite counter top installation"],
      inspectionHighlights: ["Space optimization check"],
      steps: ["Layout layout", "Support building", "Wall partition", "Finish plastering"],
      desc: "Build custom half-height partition walls, kitchen borders, or breakfast counter bases."
    },

    // 4. Wall Breaking & Demolition
    {
      id: "dem-wall",
      catId: "demolition",
      name: "Wall Breaking",
      price: 999,
      priceStr: "Starting from ₹999",
      duration: "Flexible",
      rating: "4.7",
      reviews: "1.5K",
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=300&q=80&fit=crop",
      includes: ["Temporary shoring pillars setup", "Complete wall demolition", "Debris packing & clearing"],
      excludes: ["Permit collection fees"],
      inspectionHighlights: ["Load carrying check"],
      steps: ["Safety props setup", "Electricity/Water shutdown check", "Wall demolition", "Clearing"],
      desc: "Complete demolition of non-load bearing internal brick or block walls."
    },
    {
      id: "dem-rem",
      catId: "demolition",
      name: "Partition Removal",
      price: 399,
      priceStr: "Starting from ₹399",
      duration: "1-2 hrs",
      rating: "4.8",
      reviews: "1.3K",
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&q=80&fit=crop",
      includes: ["Demolishing partition walls", "Debris packing & clearing"],
      excludes: ["Rebuilding walls"],
      inspectionHighlights: ["Utility mapping"],
      steps: ["Breaking partition", "Packing debris", "Site clearing"],
      desc: "Demolish and clear internal masonry partitions or divider walls."
    },
    {
      id: "dem-opening",
      catId: "demolition",
      name: "Door/Window Opening",
      price: 599,
      priceStr: "Starting from ₹599",
      duration: "2 hrs",
      rating: "4.7",
      reviews: "820",
      image: "/tractor-emulsion.png",
      includes: ["Lintel beam installation support", "Opening cutting & edge leveling", "Window frame slot prep"],
      excludes: ["Door frame / Window glass installation"],
      inspectionHighlights: ["Lintel suitability audit", "Wall safety clearance check"],
      steps: ["Marking cutout", "Lintel slot drill", "Wall cutout", "Edge plastering"],
      desc: "Cut open brick/block walls to create a new door pathway or window frame cutout."
    }
  ];

  const cardRefs = {
    "brick-new": useRef(null), "brick-block": useRef(null), "brick-ext": useRef(null), "brick-repair": useRef(null), "brick-small": useRef(null),
    "plaster-new": useRef(null), "plaster-re": useRef(null), "plaster-crack": useRef(null), "plaster-dmg": useRef(null), "plaster-ceil": useRef(null),
    "part-room": useRef(null), "part-office": useRef(null), "part-kitchen": useRef(null), "part-internal": useRef(null), "part-ext": useRef(null),
    "house-comp": useRef(null), "house-found": useRef(null), "house-struct": useRef(null), "house-brick": useRef(null), "house-finish": useRef(null), "house-renov": useRef(null), "house-room": useRef(null),
    "office-comp": useRef(null), "office-new": useRef(null), "office-renov": useRef(null), "office-comm": useRef(null), "office-part": useRef(null), "office-struct": useRef(null), "office-floor": useRef(null),
    "dem-part": useRef(null), "dem-rem": useRef(null), "dem-door": useRef(null), "dem-window": useRef(null), "dem-wall": useRef(null), "dem-small": useRef(null)
  };

  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [searchQuery, activeTab]);

  const scrollToCard = (id) => {
    const card = cardRefs[id]?.current;
    if (!card) return;
    const container = contentRef.current;
    if (!container) {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const cardTop = card.getBoundingClientRect().top;
    const containerTop = container.getBoundingClientRect().top;
    const offset = cardTop - containerTop + container.scrollTop - 16;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  };

  const addToCart = (pkg) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === pkg.id);
      if (existing) {
        return prev.map(c => c.id === pkg.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...pkg, quantity: 1, categoryName: "Mason" }];
    });
  };

  const removeFromCart = (pkgId) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === pkgId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(c => c.id !== pkgId);
      }
      return prev.map(c => c.id === pkgId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const getCartCount = (pkgId) => {
    const item = cart.find(c => c.id === pkgId);
    return item ? item.quantity : 0;
  };

  const getSearchKeywords = (serviceId) => {
    if (serviceId.startsWith("brick")) return ["brick", "block", "wall", "cement", "laying", "extensions", "repair", "masonry"];
    if (serviceId.startsWith("plaster")) return ["plaster", "plastering", "patch", "crack", "wall", "cement", "smooth"];
    if (serviceId.startsWith("part")) return ["partition", "wall", "room", "kitchen", "office", "divider", "brickwork"];
    if (serviceId.startsWith("dem")) return ["demolition", "breaking", "wall", "partial", "removal", "cutout", "debris"];
    return [];
  };

  const filteredServices = searchQuery
    ? MASON_SERVICES.filter(s => {
      const queryLower = searchQuery.toLowerCase().trim();
      const exactMatch = s.name.toLowerCase().includes(queryLower) || s.desc.toLowerCase().includes(queryLower);
      if (exactMatch) return true;
      const keywords = getSearchKeywords(s.id);
      return queryLower.split(/\s+/).some(word =>
        keywords.some(kw => kw && (kw.includes(word) || word.includes(kw)))
      );
    })
    : MASON_SERVICES.filter(s => s.catId === activeTab);

  const totalQuantity = cart.filter(c => c.id.startsWith("mason-")).reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.filter(c => c.id.startsWith("mason-")).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="uc-paint-overlay" onClick={onClose}>
      <motion.div
        className="uc-paint-modal"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Urban Style Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

            {/* Left: Logo + divider + Location Pill */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Logo */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={onClose}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
                  <Home size={15} strokeWidth={2.5} className="text-white" />
                </div>
                <span className="text-sm font-black text-slate-900 hidden sm:block">
                  <span className="text-teal-600">Cal</span>Services
                </span>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              {/* Location Selector Pill */}
              <button
                type="button"
                onClick={() => setShowLocSearchModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-white text-xs font-extrabold text-slate-800 transition-all cursor-pointer shadow-sm max-w-[180px] sm:max-w-[260px] truncate"
                title="Select Location"
              >
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{masonLocation}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-auto" />
              </button>
            </div>

            {/* Center: Animated Search Bar */}
            <div className="relative max-w-[300px] w-full hidden sm:block">
              <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-teal-500 rounded-xl px-3 py-2 shadow-sm transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                <div className="relative flex-1 flex items-center min-w-0">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs font-extrabold text-slate-800 outline-none z-10"
                  />
                  {!searchQuery && (
                    <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden select-none">
                      <span className="text-xs font-medium text-slate-400 mr-1 shrink-0">Search for</span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={masonSearchRotateIdx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="text-xs font-bold text-slate-500 truncate"
                        >
                          '{MASON_SEARCH_HINTS[masonSearchRotateIdx]}'...
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-1 shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Location Search Modal */}
        {showLocSearchModal && (
          <AddAddressSearchModal
            onClose={() => setShowLocSearchModal(false)}
            onSelectLocation={(loc) => {
              setShowLocSearchModal(false);
              if (loc) { setMasonLocation(loc); localStorage.setItem("calservice_user_location", loc); }
            }}
            onUseCurrentLocation={() => {
              setShowLocSearchModal(false);
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                  try {
                    const res = await fetch(`https://photon.komoot.io/reverse?lon=${pos.coords.longitude}&lat=${pos.coords.latitude}`);
                    const data = await res.json();
                    if (data?.features?.[0]?.properties) {
                      const p = data.features[0].properties;
                      const display = [p.name, p.street, p.city, p.state].filter(Boolean).slice(0, 2).join(", ");
                      if (display) { setMasonLocation(display); localStorage.setItem("calservice_user_location", display); }
                    }
                  } catch (e) { }
                });
              }
            }}
          />
        )}

        <div className="uc-paint-horizontal-nav">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 pb-2 pt-1 border-b border-slate-100">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <ChevronLeft size={16} /> Back to Services
              </button>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {category?.name || "Masonry Work"}
              </h2>
            </div>
            <div className="uc-paint-horizontal-nav-list" style={{ justifyContent: "flex-start", display: "flex", gap: "1.25rem", margin: 0, padding: "8px 0" }}>
              {MASON_CATEGORIES.map(cat => {
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    className={`uc-paint-tab-btn ${isActive ? "active" : ""}`}
                    onClick={() => { setActiveTab(cat.id); setSearchQuery(""); }}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", width: "90px"
                    }}
                  >
                    <div style={{
                      width: "56px", height: "56px", borderRadius: "16px",
                      background: isActive ? "#0d9488" : "#f0fdf4",
                      border: isActive ? "1.5px solid #0d9488" : "1.5px solid #dcfce7",
                      color: isActive ? "#ffffff" : "#059669",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem",
                      boxShadow: isActive ? "0 4px 12px rgba(13,148,136,0.25)" : "0 2px 6px rgba(0, 0, 0, 0.04)",
                      transition: "all 0.2s ease"
                    }}>
                      {cat.icon}
                    </div>
                    <span className="uc-paint-tab-label" style={{
                      marginTop: "6px", fontSize: "0.68rem", lineHeight: "1.2",
                      fontWeight: isActive ? 900 : 700, color: isActive ? "#0f172a" : "#64748b",
                      textAlign: "center"
                    }}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Container - Only this scrolls */}
        <div className="uc-paint-content" ref={contentRef}>
          <div className="uc-paint-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Title & Rating */}
            <div className="uc-paint-hero-row">
              <h2 className="uc-paint-sidebar-title">Masonry & Civil Services</h2>
              <div className="uc-paint-sidebar-rating">
                <Star size={14} style={{ fill: "#fbbf24", color: "#fbbf24" }} />
                <span>4.8 (Verified Structural Professionals)</span>
              </div>
            </div>

            <div className="uc-paint-main-layout">
              {/* Middle Column - Choices Cards */}
              <div className="uc-paint-middle-col">
                <div className="uc-paint-choices">
                  <h3 className="uc-paint-section-title">
                    {MASON_CATEGORIES.find(c => c.id === activeTab)?.name}
                  </h3>

                  {/* Demolition Structural Warning Banner */}
                  {activeTab === "demolition" && (
                    <div style={{
                      display: "flex", gap: "10px", padding: "1rem", borderRadius: "12px",
                      background: "#fff1f2", border: "1.5px solid #ffe4e6", color: "#be123c",
                      fontSize: "0.82rem", fontWeight: 800, marginBottom: "1.25rem", textAlign: "left",
                      alignItems: "center"
                    }}>
                      <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                      <span>Structural wall removal requires professional site inspection and approval.</span>
                    </div>
                  )}

                  <div className="uc-paint-list" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {filteredServices.map(service => {
                      const count = getCartCount(service.id);
                      return (
                        <div
                          key={service.id}
                          ref={cardRefs[service.id]}
                          style={{
                            borderBottom: "1.5px solid #f1f5f9", padding: "1.25rem 0",
                            background: "#ffffff", display: "flex", flexDirection: "column"
                          }}
                        >
                          <div style={{ display: "flex", gap: "1.25rem", textAlign: "left", alignItems: "flex-start" }}>
                            {/* Left Info Column */}
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", margin: "0 0 4px 0" }}>{service.name}</h4>
                              <p style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0d9488", margin: 0 }}>
                                {service.priceStr}
                                {service.duration && <span style={{ color: "#94a3b8", fontWeight: 500, marginLeft: "8px" }}>• {service.duration}</span>}
                              </p>
                              <p style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "6px", lineHeight: 1.4, margin: "6px 0 10px 0" }}>{service.desc}</p>

                              {/* Includes Badges */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {service.includes.slice(0, 3).map((inc, i) => (
                                  <span key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "12px" }}>
                                    ✓ {inc}
                                  </span>
                                ))}
                              </div>

                              <button
                                onClick={() => setActiveDetailService(service)}
                                style={{
                                  background: "none", border: "none", color: "#0d9488", fontWeight: 800, fontSize: "0.75rem",
                                  cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", marginTop: "12px", padding: 0
                                }}
                              >
                                View details <ChevronRight size={13} />
                              </button>
                            </div>

                            {/* Right Image/Button Column */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                              <div style={{ width: "112px", height: "96px", borderRadius: "16px", overflow: "hidden", background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                                <img
                                  src={service.image}
                                  alt={service.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={e => {
                                    e.target.onerror = null;
                                    e.target.src = "/premium-emulsion.png";
                                  }}
                                />
                              </div>

                              {/* Cart Controls */}
                              {count > 0 ? (
                                <div style={{
                                  display: "flex", alignItems: "center", gap: "12px", border: "1.5px solid #0d9488",
                                  background: "#f0fdf4", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", fontWeight: 900, color: "#0f766e"
                                }}>
                                  <button onClick={() => removeFromCart(service.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0d9488", fontWeight: 900 }}>-</button>
                                  <span>{count}</span>
                                  <button onClick={() => addToCart(service)} style={{ background: "none", border: "none", cursor: "pointer", color: "#0d9488", fontWeight: 900 }}>+</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(service)}
                                  style={{
                                    background: "#ffffff", border: "1.5px solid #cbd5e1", color: "#0d9488", borderRadius: "20px",
                                    padding: "5px 16px", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                                  }}
                                >
                                  + ADD
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Questionnaire Inputs Embedded inside Complete construction cards (when not added yet) */}
                          {service.customForm === "house" && count === 0 && (
                            <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "1rem 0 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                              <div style={{ textAlign: "left" }}>
                                <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Project details</label>
                                <textarea
                                  value={houseProject.desc}
                                  onChange={e => setHouseProject(prev => ({ ...prev, desc: e.target.value }))}
                                  placeholder="Describe your vision (e.g. floors, preferred materials)..."
                                  style={{ width: "100%", height: "80px", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem", resize: "none", fontFamily: "inherit" }}
                                />
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", textAlign: "left" }}>
                                <div>
                                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Plot details</label>
                                  <input
                                    type="text"
                                    value={houseProject.details}
                                    onChange={e => setHouseProject(prev => ({ ...prev, details: e.target.value }))}
                                    placeholder="e.g. 30x40 plot..."
                                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem" }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Location address</label>
                                  <input
                                    type="text"
                                    value={houseProject.location}
                                    onChange={e => setHouseProject(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="Full address in Hosur..."
                                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem" }}
                                  />
                                </div>
                              </div>
                              <div style={{ textAlign: "left" }}>
                                <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Drawings/Photos</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => handlePhotoUpload(e, "house")}
                                  style={{ fontSize: "0.75rem", color: "#64748b" }}
                                />
                                {houseProject.photoPreview && (
                                  <img src={houseProject.photoPreview} alt="Preview" style={{ marginTop: "10px", width: "100px", height: "75px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                                )}
                              </div>
                            </div>
                          )}

                          {service.customForm === "office" && count === 0 && (
                            <div style={{ background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "1rem 0 0", display: "flex", flexDirection: "column", gap: "1rem" }}>
                              <div style={{ textAlign: "left" }}>
                                <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "6px" }}>Project Type</label>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  {["New Construction", "Renovation", "Modification"].map(t => (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() => setOfficeProject(prev => ({ ...prev, type: t }))}
                                      style={{
                                        flex: 1, padding: "0.5rem 0.25rem", borderRadius: "8px", border: officeProject.type === t ? "1.5px solid #0d9488" : "1px solid #cbd5e1",
                                        background: officeProject.type === t ? "#f0fdf4" : "#ffffff", color: officeProject.type === t ? "#0d9488" : "#475569",
                                        fontWeight: 800, fontSize: "0.75rem", cursor: "pointer", transition: "all 0.15s"
                                      }}
                                    >
                                      {t}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", textAlign: "left" }}>
                                <div>
                                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Approx Area (sqft)</label>
                                  <input
                                    type="text"
                                    value={officeProject.area}
                                    onChange={e => setOfficeProject(prev => ({ ...prev, area: e.target.value }))}
                                    placeholder="e.g. 1500 sqft..."
                                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem" }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Location address</label>
                                  <input
                                    type="text"
                                    value={officeProject.location}
                                    onChange={e => setOfficeProject(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder="Full address in Hosur..."
                                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem" }}
                                  />
                                </div>
                              </div>
                              <div style={{ textAlign: "left" }}>
                                <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Drawings/Photos</label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => handlePhotoUpload(e, "office")}
                                  style={{ fontSize: "0.75rem", color: "#64748b" }}
                                />
                                {officeProject.photoPreview && (
                                  <img src={officeProject.photoPreview} alt="Preview" style={{ marginTop: "10px", width: "100px", height: "75px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                                )}
                              </div>
                            </div>
                          )}
                          {/* General description box for standard masonry when added */}
                          {count > 0 && (
                            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", margin: "1rem 0 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                              <div style={{ textAlign: "left" }}>
                                <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#475569", display: "block", marginBottom: "4px" }}>Describe requirement (optional)</label>
                                <textarea
                                  value={generalDesc}
                                  onChange={e => setGeneralDesc(e.target.value)}
                                  placeholder="Explain your needs in detail (e.g. wall size, crack types)..."
                                  style={{ width: "100%", height: "60px", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.8rem", resize: "none", fontFamily: "inherit" }}
                                />
                              </div>
                              <div style={{ textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                  <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569", display: "inline-block", marginRight: "10px" }}>Upload photo</label>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handlePhotoUpload(e, "general")}
                                    style={{ fontSize: "0.75rem", color: "#64748b" }}
                                  />
                                </div>
                                {generalPhotoPreview && (
                                  <img src={generalPhotoPreview} alt="Preview" style={{ width: "60px", height: "45px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e1" }} />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  </div>
                </div>

                {/* Free Site Inspection Details Block */}
                <div style={{ background: "#f0fdf4", padding: "1.5rem", borderRadius: "16px", border: "1px dashed #34d399", textAlign: "left", margin: "2rem 0" }}>
                  <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", fontWeight: 900, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={16} color="#059669" /> 🟢 Free Site Inspection Included
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Check size={14} style={{ color: "#10b981", marginTop: "3px" }} />
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#065f46" }}>Area measurement</span>
                        <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#374151" }}>Accurate site measuring to avoid estimation errors.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Check size={14} style={{ color: "#10b981", marginTop: "3px" }} />
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#065f46" }}>Surface/structure assessment</span>
                        <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#374151" }}>Expert analysis of wall health, structural load, or dampness source.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Check size={14} style={{ color: "#10b981", marginTop: "3px" }} />
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#065f46" }}>Material requirement</span>
                        <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#374151" }}>Itemized details of cement, sand, brick, or steel required.</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <Check size={14} style={{ color: "#10b981", marginTop: "3px" }} />
                      <div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#065f46" }}>Work scope estimation</span>
                        <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#374151" }}>Detailed labor cost and timeline projection.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CalServices vs Local Contractor Comparison Block */}
                <div className="uc-paint-comparison-section" style={{ margin: "2rem 0", background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
                  <div style={{ padding: "1.25rem 1.5rem 0.75rem", borderBottom: "1px solid #f1f5f9" }}>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", textAlign: "left" }}>Why choose CalServices Masonry?</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b", textAlign: "left" }}>See how CalServices compares to typical local contractors.</p>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 800, color: "#475569", width: "40%", borderRight: "2px solid #34d399" }}>Services</th>
                          <th style={{
                            padding: "1rem", textAlign: "center", fontSize: "0.85rem", fontWeight: 900,
                            color: "#0d9488", background: "#f0fdf4", width: "30%", borderLeft: "2px solid #34d399", borderRight: "2px solid #34d399"
                          }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                              <span style={{ color: "#0f172a", fontWeight: 900, letterSpacing: "0.02em" }}>CAL<span style={{ color: "#0d9488" }}>services</span></span>
                            </div>
                          </th>
                          <th style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", fontWeight: 800, color: "#64748b", width: "30%", borderLeft: "2px solid #34d399" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                              <User size={15} style={{ color: "#8b5cf6" }} />
                              <span>Local Contractor</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { title: "Accurate Structural Estimation", desc: "No guess estimation. Real calculations." },
                          { title: "Verified Masonry Experts", desc: "Background-checked, certified professionals." },
                          { title: "Fixed, Itemized Material Cost", desc: "Transparent breakdown of sand, cement, bricks." },
                          { title: "Cleanup After Construction Debris", desc: "We clear all debris and construction mess." },
                          { title: "1-Year Structural Warranty", desc: "1-year warranty against cracks or dampness repair." }
                        ].map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", fontWeight: 700, color: "#334155", textAlign: "left", borderRight: "2px solid #34d399" }}>
                              <span style={{ marginRight: "6px", color: "#94a3b8" }}>•</span>
                              <span style={{ fontWeight: 800, color: "#1e293b" }}>{row.title}</span>
                              <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500, marginTop: "2px" }}>{row.desc}</div>
                            </td>
                            <td style={{
                              padding: "0.85rem 1rem", textAlign: "center", background: "#f0fdf4",
                              borderLeft: "2px solid #34d399", borderRight: "2px solid #34d399"
                            }}>
                              <Check size={16} strokeWidth={3} style={{ color: "#10b981", margin: "0 auto" }} />
                            </td>
                            <td style={{ padding: "0.85rem 1rem", textAlign: "center", borderLeft: "2px solid #34d399" }}>
                              <X size={16} strokeWidth={2.5} style={{ color: "#ef4444", margin: "0 auto" }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column - Promise & Cart Summary */}
              <div className="uc-paint-right-col">
                <div className="uc-paint-promise-card">
                  <div className="uc-paint-promise-title-row">
                    <ShieldCheck size={18} style={{ color: "#059669" }} />
                    <span>CalServices Promise</span>
                  </div>
                  <ul className="uc-paint-promise-list">
                    <li className="uc-paint-promise-item">
                      <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                      <span>Verified Professionals</span>
                    </li>
                    <li className="uc-paint-promise-item">
                      <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                      <span>1-Year Structural Warranty</span>
                    </li>
                    <li className="uc-paint-promise-item">
                      <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                      <span>Debris Post-Service Cleanup</span>
                    </li>
                  </ul>
                </div>

                <div className="uc-paint-cart-card">
                  <h4 className="uc-paint-cart-card-title">Your Cart</h4>
                  {cart.filter(c => c.id.startsWith("mason-")).length === 0 ? (
                    <div>
                      <ShoppingCart className="uc-paint-empty-cart-img" style={{ color: "#94a3b8" }} />
                      <p className="uc-paint-empty-cart-text">No items in your cart</p>
                    </div>
                  ) : (
                    <div>
                      <div className="uc-paint-cart-items">
                        {cart.filter(c => c.id.startsWith("mason-")).map(item => (
                          <div key={item.id} className="uc-paint-cart-item">
                            <div className="uc-paint-cart-item-info">
                              <span className="uc-paint-cart-item-name">{item.name}</span>
                              {item.price > 0 && (
                                <span className="uc-paint-cart-item-price">{BOOKING_CURRENCY_SYMBOL}{item.price.toLocaleString()}</span>
                              )}
                            </div>
                            <div className="uc-paint-cart-item-qty">
                              <button onClick={() => removeFromCart(item.id)}>−</button>
                              <span>{item.quantity}</span>
                              <button onClick={() => addToCart(item)}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="uc-paint-cart-subtotal">
                        <span>Site Inspection</span>
                        <span style={{ color: '#059669', fontWeight: 800 }}>FREE</span>
                      </div>
                      <button className="uc-paint-cart-checkout-btn" onClick={onCheckout}>
                        Book Free Inspection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* App Banner & Main Footer */}
          <div className="uc-paint-footer-section">
            <div className="uc-paint-container">
              <div className="uc-paint-app-banner">
                <div className="uc-paint-app-banner-left">
                  <div className="uc-paint-app-banner-icon">
                    <Smartphone size={24} style={{ color: "#ffffff" }} />
                  </div>
                  <div className="uc-paint-app-banner-text">
                    <span className="uc-paint-app-banner-tag">Book on the go!</span>
                    <h4 className="uc-paint-app-banner-title">Download the CalServices App</h4>
                    <p className="uc-paint-app-banner-desc">Faster booking, real-time tracking & exclusive app offers.</p>
                  </div>
                </div>
                <div className="uc-paint-app-banner-right">
                  <button className="uc-paint-store-btn">Get it on Google Play</button>
                  <button className="uc-paint-store-btn" style={{ marginLeft: '1rem' }}>Download on App Store</button>
                </div>
              </div>
            </div>

            <div className="uc-paint-main-footer">
              <div className="uc-paint-container uc-paint-main-footer-inner">
                {/* Col 1 */}
                <div className="uc-paint-footer-col">
                  <div className="uc-paint-footer-logo-row">
                    <CalTrackLogo size={24} />
                    <span className="uc-paint-footer-brand">CalServices</span>
                  </div>
                  <p className="uc-paint-footer-brand-desc">
                    Your trusted partner for all home services. Quality you can count on.
                  </p>
                  <div className="uc-paint-footer-socials">
                    <span className="uc-paint-social-icon"><FacebookMark style={{ width: 16, height: 16 }} /></span>
                    <span className="uc-paint-social-icon"><InstagramMark style={{ width: 16, height: 16 }} /></span>
                    <span className="uc-paint-social-icon"><YoutubeMark style={{ width: 16, height: 16 }} /></span>
                    <span className="uc-paint-social-icon"><TwitterMark style={{ width: 16, height: 16 }} /></span>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="uc-paint-footer-col">
                  <h5 className="uc-paint-footer-col-title">Services</h5>
                  <ul className="uc-paint-footer-links">
                    <li>Home Services & Pest Control</li>
                    <li>Paintings</li>
                    <li>Mason</li>
                    <li>AC & Appliance</li>
                  </ul>
                </div>

                {/* Col 3 */}
                <div className="uc-paint-footer-col">
                  <h5 className="uc-paint-footer-col-title">Company</h5>
                  <ul className="uc-paint-footer-links">
                    <li>About Us</li>
                    <li>Careers</li>
                    <li>Blog</li>
                    <li>Become a Partner</li>
                  </ul>
                </div>

                {/* Col 4 */}
                <div className="uc-paint-footer-col">
                  <h5 className="uc-paint-footer-col-title">Need Help?</h5>
                  <ul className="uc-paint-footer-contact">
                    <li>
                      <Phone size={14} />
                      <span>+91 98765 43210</span>
                    </li>
                    <li>
                      <Mail size={14} />
                      <span>support@calservices.com</span>
                    </li>
                    <li>
                      <Clock size={14} />
                      <span>Mon - Sun (8 AM - 8 PM)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Cart Bar */}
        {totalQuantity > 0 && (
          <motion.div
            className="uc-paint-bottom-bar"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            <div className="uc-paint-container uc-paint-bottom-bar-inner">
              <div className="uc-paint-bottom-left">
                <span className="uc-paint-bottom-items">{totalQuantity} Service(s) selected</span>
                <span className="uc-paint-bottom-total">Free Site Inspection</span>
              </div>
              <button className="uc-paint-bottom-btn" onClick={onCheckout}>
                Book Inspection <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Detail Popup Modal */}
        <AnimatePresence>
          {activeDetailService && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 11000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)'
            }} onClick={() => setActiveDetailService(null)}>
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 320 }}
                style={{
                  background: '#ffffff', borderRadius: 28, width: '100%', maxWidth: 480,
                  boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
                  position: 'relative', display: 'flex', flexDirection: 'column',
                  maxHeight: '85vh', overflow: 'hidden', margin: '1rem',
                  fontFamily: 'inherit'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Close icon */}
                <button
                  onClick={() => setActiveDetailService(null)}
                  style={{
                    position: 'absolute', top: 16, right: 16, width: 34, height: 34,
                    borderRadius: '50%', background: 'rgba(255,255,255,0.95)', border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 10, color: '#0f172a',
                    transition: 'all 0.2s'
                  }}
                  className="hover:scale-105 active:scale-95"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>

                {/* Hero Image */}
                <div style={{ width: '100%', height: 180, position: 'relative', flexShrink: 0 }}>
                  <img
                    src={activeDetailService.image}
                    alt={activeDetailService.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.src = "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=800&q=80&fit=crop" }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))' }} />
                </div>

                {/* Content Area */}
                <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Title & Rating */}
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', textAlign: 'left', letterSpacing: '-0.02em' }}>{activeDetailService.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginTop: 6 }}>
                      <Star size={14} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
                      <span style={{ color: '#0f172a', fontWeight: 800 }}>{activeDetailService.rating}</span>
                      <span>({activeDetailService.reviews} verified jobs)</span>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', flexShrink: 0 }} />

                  {/* QUICK BENEFITS */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '8px'
                  }}>
                    {[
                      { label: "Verified Experts", icon: <ShieldCheck size={14} color="#0d9488" /> },
                      { label: "1-Yr Warranty", icon: <Award size={14} color="#0f766e" /> },
                      { label: "Debris Clean-up", icon: <Sparkles size={14} color="#b45309" /> },
                      { label: "Safety First", icon: <Lock size={14} color="#2563eb" /> }
                    ].map((benefit, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        padding: '10px 4px',
                        background: '#f0fdf4',
                        border: '1.5px solid #dcfce7',
                        borderRadius: '12px',
                        textAlign: 'center',
                        gap: '6px'
                      }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                          flexShrink: 0
                        }}>
                          {benefit.icon}
                        </div>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#115e59', lineHeight: 1.2 }}>{benefit.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* WHAT'S INCLUDED */}
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', fontSize: '0.7rem' }}>✓</span> What's Included
                    </h4>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeDetailService.includes.map((inc, i) => (
                        <li key={i} style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.4 }}>
                          <span style={{ color: '#10b981', fontWeight: 'bold', marginTop: '1px' }}>•</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* WHAT'S EXCLUDED */}
                  <div style={{ textAlign: 'left', background: '#fff1f2', padding: '1rem', borderRadius: '16px', border: '1px solid #ffe4e6' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: '#ffe4e6', color: '#be123c', fontSize: '0.7rem' }}>✕</span> What's Excluded
                    </h4>
                    <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeDetailService.excludes.map((exc, i) => (
                        <li key={i} style={{ fontSize: '0.82rem', color: '#9f1239', display: 'flex', alignItems: 'flex-start', gap: '8px', lineHeight: 1.4 }}>
                          <span style={{ color: '#f43f5e', fontWeight: 'bold', marginTop: '1px' }}>•</span>
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* FREE SITE INSPECTION CARD */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    padding: '1.25rem', border: '1px dashed #34d399', borderRadius: '16px',
                    background: '#f0fdf4', color: '#065f46', textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} color="#059669" /> Free Site Inspection Highlights
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {activeDetailService.inspectionHighlights.map((high, i) => (
                        <span key={i} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', background: '#d1fae5', borderRadius: '8px', color: '#065f46' }}>{high}</span>
                      ))}
                    </div>
                  </div>

                  {/* EXECUTION STEPS TIMELINE */}
                  <div style={{ textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution Steps</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                      {activeDetailService.steps.map((step, i) => {
                        const isLast = i === activeDetailService.steps.length - 1;
                        const stepColors = ["#eff6ff", "#fff7ed", "#ecfdf5", "#ecfeff", "#faf5ff", "#fdf2f8"];
                        const stepBorders = ["#c7d2fe", "#fde68a", "#a7f3d0", "#a5f3fc", "#e9d5ff", "#fbcfe8"];
                        const stepTextColors = ["#2563eb", "#d97706", "#059669", "#0891b2", "#9333ea", "#db2777"];
                        return (
                          <div key={i} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                            {/* Icon/Timeline Dot */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                background: stepColors[i % stepColors.length], 
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900, 
                                color: stepTextColors[i % stepTextColors.length],
                                border: `1.5px solid ${stepBorders[i % stepBorders.length]}`, 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                                zIndex: 2
                              }}>
                                {i + 1}
                              </div>
                              {!isLast && (
                                <div style={{
                                  width: '2px', flex: 1, background: '#e2e8f0',
                                  margin: '4px 0', minHeight: '24px'
                                }} />
                              )}
                            </div>
                            {/* Text */}
                            <div style={{ paddingBottom: isLast ? 0 : '1rem', textAlign: 'left' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>{step}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RATINGS & REVIEWS */}
                  {(() => {
                    const rating = parseFloat(activeDetailService.rating) || 4.8;
                    const rawVal = parseFloat(activeDetailService.reviews);
                    const multiplier = activeDetailService.reviews.toLowerCase().includes('k') ? 1000 : 1;
                    const totalR = isNaN(rawVal) ? 100 : Math.round(rawVal * multiplier);
                    const r5 = Math.round(totalR * 0.78);
                    const r4 = Math.round(totalR * 0.15);
                    const r3 = Math.round(totalR * 0.05);
                    const r2 = Math.round(totalR * 0.015);
                    const r1 = Math.round(totalR * 0.005);
                    const sumW = r5 + r4 + r3 + r2 + r1 || 100;
                    const w5 = Math.round((r5 / sumW) * 100);
                    const w4 = Math.round((r4 / sumW) * 100);
                    const w3 = Math.round((r3 / sumW) * 100);
                    const w2 = Math.round((r2 / sumW) * 100);
                    const w1 = Math.round((r1 / sumW) * 100);

                    return (
                      <div style={{ textAlign: 'left', marginTop: '0.2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginBottom: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ratings & Reviews</h4>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1.25rem',
                          padding: '1rem',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '16px',
                          background: '#ffffff'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                            <span style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e293b', lineHeight: 1 }}>{rating.toFixed(2)}</span>
                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>avg rating</span>
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            {[
                              { star: 5, count: r5, width: w5 },
                              { star: 4, count: r4, width: w4 },
                              { star: 3, count: r3, width: w3 },
                              { star: 2, count: r2, width: w2 },
                              { star: 1, count: r1, width: w1 },
                            ].map(row => (
                              <div key={row.star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>
                                <span style={{ minWidth: '20px', display: 'flex', alignItems: 'center', gap: '2px', color: '#94a3b8' }}>
                                  <Star size={11} style={{ fill: '#94a3b8', color: '#94a3b8' }} /> {row.star}
                                </span>
                                <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                                  <div style={{ width: `${row.width}%`, height: '100%', background: '#334155', borderRadius: '99px' }} />
                                </div>
                                <span style={{ minWidth: '40px', textAlign: 'right', fontSize: '0.68rem', color: '#475569' }}>{row.count.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* CUSTOMER REVIEWS LIST */}
                  {(() => {
                    const extra = MASON_DETAILS_EXTRA[activeDetailService?.id] || { reviews: [], faqs: [] };
                    if (extra.reviews.length === 0) return null;
                    return (
                      <div style={{ textAlign: 'left', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Customer Reviews</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {extra.reviews.map((rev, idx) => (
                            <div key={idx} style={{ padding: '0.75rem 1rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1e293b' }}>{rev.name}</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <Star size={12} style={{ fill: '#0d9488', color: '#0d9488' }} /> {rev.rating.toFixed(1)}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', lineHeight: 1.3 }}>
                                "{rev.comment}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* FREQUENTLY ASKED QUESTIONS */}
                  {(() => {
                    const extra = MASON_DETAILS_EXTRA[activeDetailService?.id] || { reviews: [], faqs: [] };
                    if (extra.faqs.length === 0) return null;
                    return (
                      <div style={{ textAlign: 'left', marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Frequently Asked Questions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {extra.faqs.map((faq, idx) => {
                            const isExpanded = expandedFaq === idx;
                            return (
                              <div key={idx} style={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
                                <div 
                                  onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                                >
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{faq.q}</span>
                                  <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#94a3b8' }}>
                                    {isExpanded ? '−' : '+'}
                                  </span>
                                </div>
                                {isExpanded && (
                                  <div style={{ padding: '0 1rem 0.75rem 1rem', fontSize: '0.72rem', color: '#475569', lineHeight: 1.4, borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', background: '#f8fafc' }}>
                                    {faq.a}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Footer Action Button */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', background: '#ffffff', flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setActiveDetailService(null);
                      addToCart(activeDetailService);
                    }}
                    style={{
                      width: '100%', padding: '0.8rem',
                      background: 'linear-gradient(135deg, #0d9488, #059669)',
                      color: 'white', border: 'none', borderRadius: 10,
                      fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(13,148,136,0.22)',
                    }}
                  >
                    Add Service
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function CustomCleaningPackageModal({ category, cart, setCart, onClose, onCheckout, isFullPage = false }) {
  const rawCatKey = (category?.id || category?.slug || "cleaning").toLowerCase();
  let normalizedKey = "cleaning";
  if (["hvac", "ac", "ac_appliance", "appliance_repair", "appliance"].some(k => rawCatKey.includes(k))) normalizedKey = "hvac";
  else if (["electrical", "electricity", "elec"].some(k => rawCatKey.includes(k))) normalizedKey = "electrical";
  else if (["plumbing", "plumber", "plum"].some(k => rawCatKey.includes(k))) normalizedKey = "plumbing";
  else if (["carpentry", "carpenter", "carp"].some(k => rawCatKey.includes(k))) normalizedKey = "carpentry";
  else if (["painting", "painter", "paint"].some(k => rawCatKey.includes(k))) normalizedKey = "painting";
  else if (["mason", "masonry", "civil"].some(k => rawCatKey.includes(k))) normalizedKey = "mason";
  else if (["pest", "pest_control"].some(k => rawCatKey.includes(k))) normalizedKey = "pest_control";
  else if (["goods", "transport", "mini_truck", "truck"].some(k => rawCatKey.includes(k))) normalizedKey = "goods_transport";

  const CATEGORY_SUBCATEGORIES = {
    hvac: [
      { name: "AC Service & Repair", image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=300&q=80&fit=crop" },
      { name: "AC Installation", image: "https://images.unsplash.com/photo-1610486842247-7505ed272fc4?w=300&q=80&fit=crop" },
      { name: "Washing Machine", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
      { name: "Refrigerator & Fridge", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" },
      { name: "Microwave & Purifier", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" }
    ],
    electrical: [
      { name: "Switches & Sockets", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop" },
      { name: "Fan & Lighting", image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop" },
      { name: "MCB & Wiring", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" },
      { name: "Inverter & Heavy Appliance", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
    ],
    plumbing: [
      { name: "Taps & Mixers", image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&q=80&fit=crop" },
      { name: "Drainage & Clog", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" },
      { name: "Toilet & Flush Tank", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
      { name: "Water Heater & Tank", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" }
    ],
    carpentry: [
      { name: "Lock & Handle", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
      { name: "Furniture Repair", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" },
      { name: "Doors & Windows", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" },
      { name: "Drill & Hanging", image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=300&q=80&fit=crop" }
    ],
    painting: [
      { name: "Interior Painting", image: "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=300&q=80&fit=crop" },
      { name: "Exterior Painting", image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=300&q=80&fit=crop" },
      { name: "Wall Waterproofing", image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&q=80&fit=crop" },
      { name: "Wood & Metal Polish", image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=300&q=80&fit=crop" },
      { name: "Texture Decor", image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&q=80&fit=crop" }
    ],
    mason: [
      { name: "Brick & Block Work", image: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=300&q=80&fit=crop" },
      { name: "Plastering & Wall Repair", image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" },
      { name: "Wall & Partition Construction", image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=300&q=80&fit=crop" },
      { name: "House Construction", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop" },
      { name: "Demolition & Breaking", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&q=80&fit=crop" }
    ],
    pest_control: [
      { name: "Termite Control", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
      { name: "Cockroach & Ant Control", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" },
      { name: "Bed Bug Treatment", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" }
    ],
    goods_transport: [
      { name: "House Shifting", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop" },
      { name: "Single Item Transport", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
    ],
    cleaning: [
      { name: "Kitchen Cleaning", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&q=80&fit=crop", catId: "kitchen_cleaning" },
      { name: "Sofa Cleaning", image: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=300&q=80&fit=crop", catId: "sofa_cleaning" },
      { name: "Bathroom Cleaning", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop", catId: "bathroom_cleaning" },
      { name: "Furnished Apartment", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&q=80&fit=crop" },
      { name: "Unfurnished Apartment", image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80&fit=crop" },
      { name: "Furnished Villa", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop" },
      { name: "Unfurnished Villa", image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=300&q=80&fit=crop" },
      { name: "Book by Room", image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=300&q=80&fit=crop" },
      { name: "Mini Services", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" }
    ]
  };

  const subCategories = CATEGORY_SUBCATEGORIES[normalizedKey] || CATEGORY_SUBCATEGORIES.cleaning;

  const [activeSubTab, setActiveSubTab] = useState(subCategories[0]?.name || "Furnished Apartment");

  // Keep activeSubTab in sync if normalizedKey changes
  useEffect(() => {
    if (subCategories && subCategories.length > 0) {
      setActiveSubTab(subCategories[0].name);
    }
  }, [normalizedKey]);

  const [bhkSelections, setBhkSelections] = useState({
    essential: 3,
    premium: 3,
    elite: 3
  });
  const [isVipJoined, setIsVipJoined] = useState(false);
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getBhkPrice = (tabName, planId, bhk) => {
    const bhkIdx = bhk - 1;
    if (tabName === "Furnished Apartment") {
      if (planId === "essential") return [1899, 2499, 2999, 3409, 3999][bhkIdx];
      if (planId === "premium") return [2199, 2799, 3299, 3759, 4299][bhkIdx];
      if (planId === "elite") return [2999, 3599, 4099, 4579, 5199][bhkIdx];
    }
    if (tabName === "Unfurnished Apartment") {
      if (planId === "essential") return [1599, 2139, 2639, 3139, 3639][bhkIdx];
      if (planId === "premium") return [1899, 2409, 2909, 3409, 3909][bhkIdx];
      if (planId === "elite") return [2499, 2999, 3499, 3999, 4499][bhkIdx];
    }
    if (tabName === "Furnished Villa") {
      if (planId === "essential") return [2439, 2939, 3439, 4439, 5439][bhkIdx];
      if (planId === "premium") return [3729, 4729, 5729, 6729, 7729][bhkIdx];
      if (planId === "elite") return [4599, 5599, 6599, 7599, 8599][bhkIdx];
    }
    if (tabName === "Unfurnished Villa") {
      if (planId === "essential") return [2419, 2919, 3419, 4419, 5419][bhkIdx];
      if (planId === "premium") return [3819, 4319, 4819, 5819, 6819][bhkIdx];
      if (planId === "elite") return [4499, 4999, 5499, 6499, 7499][bhkIdx];
    }
    return 1000;
  };

  const getBhkDuration = (planId) => {
    if (planId === "essential") return "4 hrs";
    if (planId === "premium") return "4 hrs";
    return "4.5 hrs";
  };

  const getCartItemCount = (itemId) => {
    const item = cart.find(c => c.id === itemId);
    return item ? item.quantity : 0;
  };

  const addItemToCart = (itemId, itemName, itemPrice, itemDuration) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (existing) {
        return prev.map(c => c.id === itemId ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: itemId, name: itemName, price: itemPrice, duration: itemDuration, quantity: 1, categoryName: category.name }];
    });
  };

  const removeItemFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(c => c.id !== itemId);
      }
      return prev.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const subtotal = cart.reduce((acc, c) => acc + (c.price * c.quantity), 0);
  const couponDiscount = isCouponApplied ? Math.round(subtotal * 0.1) : 0;
  const vipSavings = isVipJoined ? Math.round(subtotal * 0.15) : 0;
  const totalAmount = Math.max(0, subtotal + (isVipJoined ? 299 : 0) - couponDiscount - vipSavings);

  const apartmentVillaPlans = [
    {
      id: "essential",
      name: "Essential Plan",
      badge: "Value Choice",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
      description: "Thorough deep cleaning of essential areas: kitchens, bathrooms, and floor sweep-mops.",
      icon: "⭐",
      includes: [
        "Bathroom & kitchen deep cleaning",
        "Machine cleaning of floors, doors & windows",
        "Cobweb removal, ceiling & fan dusting",
        "Balcony & utility area cleaning",
        "Cabinet & furniture exterior dusting & wet wiping"
      ],
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop"
    },
    {
      id: "premium",
      name: "Premium Plan",
      badge: "Best Value",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
      description: "Detailed deep cleaning including complete cabinet interior sanitization and stain degreasing.",
      icon: "💎",
      includes: [
        "Includes everything in Essential Plan",
        "Cupboard cleaning (interior & exterior)",
        "Cabinets interior with complete utensil removal & wash",
        "Wall dry dusting and major stain spot wipe",
        "Tile grout deep scrubbing"
      ],
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop"
    },
    {
      id: "elite",
      name: "Elite Plan",
      badge: "Signature Care",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-100",
      description: "Top-tier premium restoration including mechanical dry shampooing of sofa, carpet, and mattress.",
      icon: "👑",
      includes: [
        "Includes everything in Premium Plan",
        "Sofa, carpet & mattress vacuum & dry shampooing",
        "Whole house steam sanitization",
        "Eco-friendly dust repellent coat application",
        "Balcony pressure washing & drain flush"
      ],
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop"
    }
  ];

  const bookByRoomPlans = [
    {
      id: "room-bedroom",
      name: "Bedroom Deep Cleaning",
      price: 599,
      duration: "1 hr",
      description: "Thorough vacuuming, window wipe, fan dusting, floor mopping, and wardrobe exterior clean.",
      includes: ["Wardrobe dusting", "Dry vacuuming of mattress", "Floor dry & wet mopping"],
      image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=300&q=80&fit=crop"
    },
    {
      id: "room-living",
      name: "Living Room Detailing",
      price: 699,
      duration: "1.5 hrs",
      description: "Deep dust-wipe of entertainment consoles, sofa dry vacuuming, glass polishing, and carpet shake.",
      includes: ["Sofa & carpet dry vacuuming", "Glass panel polishing", "Floor scrubbing"],
      image: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&q=80&fit=crop"
    },
    {
      id: "room-floor",
      name: "Floor Scrubbing & Wash",
      price: 399,
      duration: "1 hr",
      description: "Machine-assisted high-speed floor scrub to remove dark spots and restore original tile shine.",
      includes: ["Machine scrubbing", "Germicide wash", "Corner grout detailing"],
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop"
    }
  ];

  const miniServicesPlans = [
    {
      id: "mini-fridge",
      name: "Refrigerator Deep Cleaning",
      price: 299,
      duration: "45 mins",
      description: "Defrosting, rack wash, shelf wipe down, door gasket disinfection, and exterior polish.",
      includes: ["Internal rack wash", "Gasket cleaning & disinfection", "Deodorizing treatment"],
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop"
    },
    {
      id: "mini-microwave",
      name: "Oven & Microwave Cleaning",
      price: 149,
      duration: "30 mins",
      description: "Removal of burnt oil, splash stains, steam disinfection, and turntable polishing.",
      includes: ["Internal degreasing", "Glass tray wash", "Deodorizer spray"],
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop"
    },
    {
      id: "mini-balcony",
      name: "Balcony Scrubbing",
      price: 299,
      duration: "1 hr",
      description: "Dusting railings, window exterior spray, cobweb removal, and high pressure floor scrub.",
      includes: ["Railings wipe", "Floor scrubbing & wash", "Utility drainage flush"],
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop"
    }
  ];

  // Service items catalog for non-cleaning categories
  const OTHER_SERVICES = {
    hvac: {
      "AC Service & Repair": [
        { id: "hvac-serv-1", name: "Power Jet AC Foam Service", price: 599, duration: "45 mins", badge: "Value Choice", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Deep jet spray foam wash of indoor & outdoor coils with 2-stage filtration wash.", includes: ["Indoor unit jet foam wash", "Outdoor unit high pressure spray", "Gas & cooling performance check", "30-day service warranty"], image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=300&q=80&fit=crop" },
        { id: "hvac-serv-2", name: "AC Gas Leakage Fix & Refill", price: 1499, duration: "1.5 hrs", badge: "Best Seller", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Nitrogen pressure leak detection, copper pipe brazing, and 100% full Freon/R32 gas refill.", includes: ["Nitrogen leak testing", "Copper brazing fix", "Vacuuming & full gas recharge", "60-day gas warranty"], image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&q=80&fit=crop" },
        { id: "hvac-serv-3", name: "AC Water Leakage & Drain Unclog", price: 399, duration: "45 mins", badge: "Quick Fix", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "Clear drain pipe clog, unblock condensation tray, flush mold debris & seal tray crack.", includes: ["Drain line vacuuming", "Anti-fungal tray flush", "Water leak prevention seal"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
        { id: "hvac-serv-4", name: "AC Noise & Fan Vibration Fix", price: 449, duration: "45 mins", badge: "Troubleshooting", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Fix squeaking/rattling blower noise, fan blade balancing, motor bushing replacement.", includes: ["Blower wheel vibration fix", "Motor bearing lubrication", "Panel tightness check"], image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=300&q=80&fit=crop" },
        { id: "hvac-serv-5", name: "AC PCB Circuit Board Repair", price: 999, duration: "1 hr", badge: "Expert PCB", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "Fix non-turning on AC, error codes on display, remote sensor failure, or PCB relay replacement.", includes: ["PCB diagnostic test", "Capacitor & relay replace", "60-day PCB warranty"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" }
      ],
      "AC Installation": [
        { id: "hvac-inst-1", name: "Split AC Wall Mounting", price: 1299, duration: "2 hrs", badge: "Recommended", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "Professional wall drilling, bracket fitting, outdoor unit alignment, and copper pipe connection.", includes: ["Indoor & outdoor mounting", "Copper pipe vacuuming", "Safety voltage test"], image: "https://images.unsplash.com/photo-1610486842247-7505ed272fc4?w=300&q=80&fit=crop" },
        { id: "hvac-inst-2", name: "Window AC Installation", price: 899, duration: "1.5 hrs", badge: "Standard", badgeColor: "bg-slate-50 text-slate-700 border-slate-100", description: "Window frame mounting, foam sealant insulation, and vibration pad fitting.", includes: ["Window frame bracket fit", "Gap sealing", "Demo & cooling check"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
        { id: "hvac-inst-3", name: "AC Uninstallation", price: 699, duration: "1 hr", badge: "Safe Removal", badgeColor: "bg-rose-50 text-rose-700 border-rose-100", description: "Safe gas pump-down into compressor, dismounting indoor/outdoor units, and copper pipe sealing.", includes: ["Gas pump down", "Units dismounting", "Copper pipe packaging"], image: "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=300&q=80&fit=crop" }
      ],
      "Washing Machine": [
        { id: "hvac-wash-1", name: "Automatic Washing Machine Service", price: 499, duration: "1 hr", badge: "Best Value", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Descaling drum clean, filter debris removal, belt tension check, and drain pump flush.", includes: ["Drum descaling wash", "Lint & coin filter clean", "Belt & motor test"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
        { id: "hvac-wash-2", name: "Washing Machine Motor & Spin Repair", price: 699, duration: "1.5 hrs", badge: "Expert Fix", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Fix drum noise, spin cycle failure, drain pump blockage, or motor capacitor issues.", includes: ["Motor & belt diagnosis", "Drain pump clearing", "30-day warranty"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" }
      ],
      "Refrigerator & Fridge": [
        { id: "hvac-ref-1", name: "Fridge Cooling & Gas Check", price: 299, duration: "45 mins", badge: "Inspection", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Compressor relay test, thermostat check, door gasket seal inspection, and gas pressure reading.", includes: ["21-point fridge inspection", "Thermostat test", "Detailed quote"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" },
        { id: "hvac-ref-2", name: "Fridge Gas Charge & Leak Repair", price: 1299, duration: "1.5 hrs", badge: "Comprehensive", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Cooling coil leak solder, capillary tube flush, filter dryer replacement, and gas recharge.", includes: ["Leak repair & soldering", "Filter replacement", "100% Gas charge"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" }
      ],
      "Microwave & Purifier": [
        { id: "hvac-micro-1", name: "Microwave Magnetron Repair", price: 499, duration: "45 mins", badge: "Popular", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "Fix non-heating issues, spark in cavity, touch keypad failure, or turntable motor replacement.", includes: ["Magnetron & diode check", "High voltage safety test", "Door lock repair"], image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" },
        { id: "hvac-micro-2", name: "RO Water Purifier Servicing", price: 399, duration: "45 mins", badge: "Essential", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Filter sediment wash, carbon filter change check, TDS level adjustment, and pump leak fix.", includes: ["Sediment & carbon check", "TDS calibration", "Leakage seal fix"], image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&q=80&fit=crop" }
      ]
    },
    electrical: {
      "Switches & Sockets": [
        { id: "elec-sw-1", name: "Switch / Socket Replacement", price: 149, duration: "30 mins", badge: "Quick Fix", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Replacement or new fitting of modular switch, 6A/16A socket, or regulator.", includes: ["Old socket removal & new fit", "Earth voltage verification", "30-day warranty"], image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop" },
        { id: "elec-sw-2", name: "Heavy Appliance Socket (16A/25A)", price: 249, duration: "45 mins", badge: "Heavy Load", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "High-grade 16A power socket installation for AC, Geyser, Washing Machine, or Oven.", includes: ["Heavy wire stripping & terminal clamp", "MCB safety check"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" },
        { id: "elec-sw-3", name: "Bedside Switchboard / 3-Pin Socket Fix", price: 199, duration: "30 mins", badge: "Daily Fix", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Fix loose contact socket, burnt switch plate, or add new extension point.", includes: ["Internal wire tightening", "Insulation sleeve fit", "Voltage load check"], image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop" }
      ],
      "Fan & Lighting": [
        { id: "elec-fan-1", name: "Ceiling Fan Repair / Fitting", price: 249, duration: "45 mins", badge: "Best Seller", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Ceiling fan installation, downrod assembly, canopy alignment & safety wire hook mounting.", includes: ["New fan mounting & downrod fit", "Safety wire hook installation", "Speed & balance test"], image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop" },
        { id: "elec-fan-2", name: "Fan Regulator / Speed Switch Replacement", price: 149, duration: "30 mins", badge: "Quick Fix", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Replace burnt or non-working step regulator knob to restore 5-speed fan control.", includes: ["Modular regulator replace", "Terminal insulation check", "5-speed current test"], image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop" },
        { id: "elec-fan-3", name: "Fan Noise, Wobble & Bearing Repair", price: 199, duration: "45 mins", badge: "Troubleshooting", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "Fix squeaking/humming fan noise, bearing lubrication, blade angle adjustment & wobble clamp.", includes: ["Bearing greasing/lubrication", "Blade pitch alignment", "Noise & wobble elimination"], image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop" },
        { id: "elec-fan-4", name: "Fan Slow Speed / Capacitor Change", price: 299, duration: "45 mins", badge: "Essential", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Fix slow rotating fan caused by degraded capacitor or coil resistance.", includes: ["Heavy capacitor replacement", "Winding resistance test", "High speed rotation verification"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" },
        { id: "elec-fan-5", name: "Exhaust Fan Installation / Repair", price: 249, duration: "45 mins", badge: "Popular", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "Kitchen or bathroom exhaust fan wall mounting, shutter flap adjustment, and motor wiring.", includes: ["Exhaust fan wall fit", "Vibration pad insertion", "Air flow test"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
        { id: "elec-fan-6", name: "LED Spot Light / Panel Light Fitting", price: 149, duration: "30 mins", badge: "Lighting", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "False ceiling LED panel cut-out fitting, driver replacement, or tube light mounting.", includes: ["LED driver connection", "Spring clip flush fit", "Illumination check"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" },
        { id: "elec-fan-7", name: "Decorative Chandelier & Hanging Lamp", price: 499, duration: "1 hr", badge: "Heavy Decor", badgeColor: "bg-rose-50 text-rose-700 border-rose-100", description: "Heavy ceiling fastener anchor drilling, chandelier wire assembly, and glass shade assembly.", includes: ["Ceiling anchor bolt fitting", "Wire harness connection", "Weight load check"], image: "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop" }
      ],
      "MCB & Wiring": [
        { id: "elec-mcb-1", name: "MCB Fuse Breaker Replacement", price: 399, duration: "45 mins", badge: "Safety Essential", badgeColor: "bg-rose-50 text-rose-700 border-rose-100", description: "Single/Double pole MCB replacement to stop frequent tripping & electrical overload.", includes: ["Tripping diagnosis", "Single/Double Pole MCB fit", "Distribution board check"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" },
        { id: "elec-mcb-2", name: "Full Room Safety Wiring Check", price: 699, duration: "1.5 hrs", badge: "Comprehensive", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Complete earthing verification, phase leakage test, and heavy load cabling report.", includes: ["Neutral & Earth leakage test", "Short circuit safety scan", "Digital safety report"], image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop" }
      ],
      "Inverter & Heavy Appliance": [
        { id: "elec-inv-1", name: "Inverter & Battery Setup", price: 499, duration: "1 hr", badge: "Heavy Power", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "Inverter wall connection, battery terminal grease, bypass switch setup & load division.", includes: ["Heavy terminal wiring", "Distilled water top-up check", "Automatic switchover test"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
      ]
    },
    plumbing: {
      "Taps & Mixers": [
        { id: "plum-tap-1", name: "Tap & Faucet Repair / Fit", price: 149, duration: "30 mins", badge: "Value", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Fix dripping taps, washer replacement, spindle fix, or install new sink/basin tap.", includes: ["Washer & spindle replace", "Leak tightness test", "Water flow check"], image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&q=80&fit=crop" },
        { id: "plum-tap-2", name: "Wall Mixer / Diverter Repair", price: 399, duration: "1 hr", badge: "Expert Fix", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Hot & cold water mixer valve replacement, shower diverter repair, and thread sealing.", includes: ["Internal cartridge fix", "Teflon tape seal", "Flow pressure test"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" }
      ],
      "Drainage & Clog": [
        { id: "plum-drain-1", name: "Sink & Drain Pipe Unclogging", price: 349, duration: "45 mins", badge: "Best Seller", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "High-flex spring wire cleaning to clear food debris, grease, and hair clogs in waste pipes.", includes: ["Spring wire clog removal", "Waste pipe trap cleaning", "Full flow test"], image: "https://images.unsplash.com/photo-1607472586893-edb57cb3b4e1?w=300&q=80&fit=crop" }
      ],
      "Toilet & Flush Tank": [
        { id: "plum-toilet-1", name: "Flush Tank Syphon & Valve Repair", price: 499, duration: "1 hr", badge: "Popular", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Fix continuous tank water leakage, syphon kit change, ball valve replacement, or flush button fix.", includes: ["Syphon kit replacement", "Internal float valve fix", "Sanitary seal check"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
      ],
      "Water Heater & Tank": [
        { id: "plum-geyser-1", name: "Geyser Water Heater Installation", price: 799, duration: "1.5 hrs", badge: "Heavy Fit", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "Wall fastener drilling, inlet/outlet braided pipe connection, safety valve fitting.", includes: ["Heavy wall fastener mounting", "Braided pipe connection", "Heating & leak test"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" }
      ]
    },
    carpentry: {
      "Lock & Handle": [
        { id: "carp-lock-1", name: "Main Door Lock / Handle Installation", price: 199, duration: "30 mins", badge: "Essential", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Mortise lock fitting, cylindrical lock replace, latch alignment, key smooth turn check.", includes: ["Lock slot chisel & fit", "Latch strike plate alignment", "Key smooth test"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
      ],
      "Furniture Repair": [
        { id: "carp-furn-1", name: "Bed & Wardrobe Assembly / Repair", price: 399, duration: "1 hr", badge: "Best Value", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Tighten loose joints, replace broken wooden slats, wardrobe door realignment, or new flatpack assembly.", includes: ["Joint tightening & glueing", "Leveling check", "30-day warranty"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" }
      ],
      "Doors & Windows": [
        { id: "carp-door-1", name: "Cabinet Soft-Close Hinge Fix", price: 249, duration: "45 mins", badge: "Popular", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Hydraulic soft-close hinge replacement, magnetic catch fitting, drawer channel smooth slide fix.", includes: ["Hinge replacement", "Door gap alignment", "Magnetic catch fit"], image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" }
      ],
      "Drill & Hanging": [
        { id: "carp-drill-1", name: "Wall Shelf / TV Bracket Mounting", price: 249, duration: "30 mins", badge: "Quick Drill", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "Laser level drilling, rawl plug anchor insertion, heavy concealed bracket shelf fitting.", includes: ["Laser leveling check", "Concealed bracket fitting", "Weight test"], image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=300&q=80&fit=crop" }
      ]
    },
    painting: {
      "Interior Painting": [
        { id: "paint-int-1", name: "Full Home Interior Emulsion Painting", price: 3499, duration: "1 day", badge: "Best Seller", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Complete putty touching, primer coat, and 2 coats premium washable emulsion paint.", includes: ["Surface masking & protection", "2 coats Asian Paints/Nerolac emulsion", "Post-paint deep cleanup"], image: "https://images.unsplash.com/photo-1596162954151-cdcb4c0f70a8?w=300&q=80&fit=crop" },
        { id: "paint-int-2", name: "Single Room / Accent Wall Paint", price: 1499, duration: "3 hrs", badge: "Popular", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Single room wall coat or royal accent wall with high sheen finish.", includes: ["1 room wall putty & sanding", "2 coats luxury emulsion", "Furniture masking"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
      ],
      "Exterior Painting": [
        { id: "paint-ext-1", name: "Exterior Weatherproof Paint Coat", price: 4999, duration: "1 day", badge: "Weather Shield", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "High-pressure wall jet wash, anti-fungal primer, and 2 coats exterior weather shield paint.", includes: ["Wall pressure wash", "Anti-algae primer coat", "2 coats weather shield"], image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=300&q=80&fit=crop" }
      ],
      "Wall Waterproofing": [
        { id: "paint-water-1", name: "Wall Dampness & Seepage Barrier", price: 2499, duration: "4 hrs", badge: "Protection", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Laser dampness scan, efflorescence scraper, and 3-layer chemical waterproof seal.", includes: ["Efflorescence salt scraper", "3-layer polymer waterproof coat", "1-year warranty"], image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&q=80&fit=crop" }
      ],
      "Wood & Metal Polish": [
        { id: "paint-wood-1", name: "Door PU Polish & Enamel Spray", price: 1299, duration: "2 hrs", badge: "Restoration", badgeColor: "bg-amber-50 text-amber-700 border-amber-100", description: "Wood surface sanding, grain filling, and 2 coats clear PU polish or enamel spray.", includes: ["Wood sanding & grain filler", "2 coats PU polish/enamel", "Hardware masking"], image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=300&q=80&fit=crop" }
      ],
      "Texture Decor": [
        { id: "paint-tex-1", name: "Royal Stencil & Designer Texture Wall", price: 2999, duration: "4 hrs", badge: "Designer Art", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Specialized metallic or velvet texture paint application with designer stencil patterns.", includes: ["Base coat preparation", "Designer texture trowel application", "Top coat metallic glaze"], image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&q=80&fit=crop" }
      ]
    },
    mason: {
      "Brick & Block Work": [
        { id: "mason-brick-1", name: "Red Brick Wall Construction", price: 1499, duration: "3 hrs", badge: "Popular", badgeColor: "bg-orange-50 text-orange-700 border-orange-100", description: "Standard red clay brick masonry work with high-grade cement mortar mix.", includes: ["Red brick supply & laying", "Cement mortar alignment", "Curing guidance"], image: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=300&q=80&fit=crop" },
        { id: "mason-brick-2", name: "AAC Concrete Block Masonry", price: 1799, duration: "3 hrs", badge: "Lightweight", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Autoclaved Aerated Concrete block laying with thin-bed adhesive mortar.", includes: ["AAC block laying", "Block adhesive jointing", "Plumb alignment check"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" }
      ],
      "Plastering & Wall Repair": [
        { id: "mason-plast-1", name: "Internal Wall Plastering & Patching", price: 899, duration: "2 hrs", badge: "Best Seller", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Smooth sand-cement plaster application, crack repair, and sponge finish.", includes: ["Crack v-groove carving", "Plaster patch application", "Smooth trowel finish"], image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop" }
      ],
      "Wall & Partition Construction": [
        { id: "mason-part-1", name: "Room Partition Wall Build", price: 2499, duration: "4 hrs", badge: "Structural", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "Half-brick or AAC block partition wall creation with door frame insertion cutout.", includes: ["Foundation course anchoring", "Block partition build", "Lintel beam support"], image: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=300&q=80&fit=crop" }
      ],
      "House Construction": [
        { id: "mason-house-1", name: "Civil Structure & Renovation Consultation", price: 999, duration: "1.5 hrs", badge: "Expert Consult", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-100", description: "On-site civil engineer assessment for home extensions, RCC slab, or foundation work.", includes: ["On-site structural evaluation", "BOQ & material estimate", "Consultation report"], image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop" }
      ],
      "Demolition & Breaking": [
        { id: "mason-demo-1", name: "Wall Demolition & Tile Chipping", price: 1299, duration: "2 hrs", badge: "Heavy Duty", badgeColor: "bg-rose-50 text-rose-700 border-rose-100", description: "Controlled wall breaking with rotary hammer drill, safety props, and debris bagging.", includes: ["Rotary breaker demotion", "Safety prop support", "Debris clearing"], image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&q=80&fit=crop" }
      ]
    },
    pest_control: {
      "Termite Control": [
        { id: "pest-term-1", name: "Termite Drill & Injection Guard", price: 2499, duration: "2 hrs", badge: "5-Yr Protection", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Precision drilling along wall bases, chemical pressure injection, and color-matched hole sealing.", includes: ["Wall base chemical injection", "Wood furniture chemical spray", "5-year warranty certificate"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
      ],
      "Cockroach & Ant Control": [
        { id: "pest-roach-1", name: "Herbal Gel & Odorless Spray", price: 799, duration: "45 mins", badge: "Odorless & Safe", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Herbal bait gel dot application in kitchen cabinets, odorless spray for drains & skirting boards.", includes: ["Kitchen cabinet gel baiting", "Bathroom drain spray", "90-day protection"], image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop" }
      ],
      "Bed Bug Treatment": [
        { id: "pest-bug-1", name: "2-Stage Bed Bug Steam & Chemical", price: 1499, duration: "1.5 hrs", badge: "Double Stage", badgeColor: "bg-purple-50 text-purple-700 border-purple-100", description: "High-temperature steam extraction of mattresses & sofas followed by residual chemical spray.", includes: ["Mattress heat steam treatment", "Residual chemical spray", "2nd visit included"], image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop" }
      ]
    },
    goods_transport: {
      "House Shifting": [
        { id: "shift-house-1", name: "Local House Shifting (1-2 BHK)", price: 3499, duration: "4 hrs", badge: "Full Service", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100", description: "Dedicated mini truck, 2 trained helpers, bubble wrap for fragile items, loading & unloading.", includes: ["Mini truck & 2 helpers", "Bubble wrap for electronics", "Unloading & placement"], image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&q=80&fit=crop" }
      ],
      "Single Item Transport": [
        { id: "shift-item-1", name: "Single Large Appliance / Furniture Pickup", price: 799, duration: "1.5 hrs", badge: "Express Pickup", badgeColor: "bg-blue-50 text-blue-700 border-blue-100", description: "Door-to-door transportation of single Sofa, Fridge, Washing Machine, or Bed.", includes: ["Express pickup truck", "Helper included", "Door delivery"], image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop" }
      ]
    }
  };

  const isApartmentVilla = normalizedKey === "cleaning" && ["Furnished Apartment", "Unfurnished Apartment", "Furnished Villa", "Unfurnished Villa"].includes(activeSubTab);
  const currentOtherPlans = (OTHER_SERVICES[normalizedKey] && OTHER_SERVICES[normalizedKey][activeSubTab]) || [];

  const getBhkTitle = (tab, planName, bhk) => {
    return `${tab} - ${planName} (${bhk} BHK)`;
  };

  const wrapperClass = isFullPage
    ? "w-full text-slate-700 bg-white min-h-screen"
    : "fixed inset-0 z-[9999] bg-white overflow-y-auto text-slate-700 w-full min-h-screen flex flex-col";

  const containerClass = isFullPage
    ? "bg-white relative flex flex-col text-slate-700 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
    : "bg-white relative flex flex-col text-slate-700 w-full max-w-7xl mx-auto min-h-screen px-4 sm:px-6 lg:px-8 py-4";

  const mainAreaClass = "flex flex-col lg:flex-row flex-1 gap-8 mt-4";

  const leftColumnClass = "flex-1 space-y-5 lg:pr-4";

  const rightColumnClass = "w-full lg:w-[380px] bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex flex-col justify-between lg:sticky lg:top-24 h-fit space-y-5 shadow-sm shrink-0";

  if (activeSubTab === "Kitchen Cleaning") {
    return <KitchenCleaningModal category={{ id: "kitchen_cleaning", name: "Kitchen Cleaning" }} cart={cart} setCart={setCart} onClose={onClose} onCheckout={onCheckout} />;
  }
  if (activeSubTab === "Sofa Cleaning") {
    return <SofaCleaningModal category={{ id: "sofa_cleaning", name: "Sofa Cleaning" }} cart={cart} setCart={setCart} onClose={onClose} onCheckout={onCheckout} />;
  }
  if (activeSubTab === "Bathroom Cleaning") {
    return <BathroomCleaningModal category={{ id: "bathroom_cleaning", name: "Bathroom Cleaning" }} cart={cart} setCart={setCart} onClose={onClose} onCheckout={onCheckout} />;
  }

  const contentMarkup = (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Modal / Cover Header + Subcategory Tabs — sticky on scroll */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pb-2 border-b border-slate-100">
        <div className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof onClose === 'function') onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft size={16} /> Back to Services
            </button>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              {category.name}
            </h2>
          </div>

          {/* Close Button */}
          <div className="flex items-center gap-3">
            {!isFullPage && (
              <button
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Subservice Flex Selector */}
        <div className="flex overflow-x-auto gap-6 pb-3 pt-2 justify-start scrollbar-none">
          {subCategories.map(tab => {
            const isSelected = activeSubTab === tab.name;
            return (
              <button
                key={tab.name}
                onClick={() => {
                  if (tab.catId) {
                    navigate(`?category=${tab.catId}`);
                    return;
                  }
                  setActiveSubTab(tab.name);
                  setSearchQuery("");
                }}
                className="flex flex-col items-center justify-center p-1.5 transition-all cursor-pointer text-center bg-transparent w-[80px] shrink-0 group"
              >
                <img
                  src={tab.image}
                  alt={tab.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop";
                  }}
                  className={`w-14 h-14 object-cover rounded-2xl mb-1.5 transition-all duration-200 ${isSelected
                    ? "scale-[1.08] shadow-md border-2 border-slate-800"
                    : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                    }`}
                />
                <span className={`text-[11px] block leading-tight tracking-tight mt-0.5 transition-colors ${isSelected ? "text-slate-900 font-black" : "text-slate-600 font-bold"
                  }`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* End of sticky header+tabs */}

      {/* Main Content Area */}
      <div className={mainAreaClass}>
        {/* Left Column: Subservice categories + package cards */}
        <div className={leftColumnClass}>

          {/* Title for Active Category */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <div className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              {activeSubTab} Packages
            </h3>
          </div>

          {/* List of package cards */}
          <div className="space-y-4">
            {/* Apartment/Villa Dynamic cards (for Cleaning) */}
            {isApartmentVilla &&
              apartmentVillaPlans
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => {
                  const currentBhk = bhkSelections[p.id] || 3;
                  const price = getBhkPrice(activeSubTab, p.id, currentBhk);
                  const duration = getBhkDuration(p.id);
                  const cartId = `clean-bhk-${activeSubTab.toLowerCase().replace(/ /g, "-")}-${p.id}-${currentBhk}bhk`;
                  const cartName = getBhkTitle(activeSubTab, p.name, currentBhk);
                  const count = getCartItemCount(cartId);

                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.icon}</span>
                          <h4 className="font-extrabold text-slate-900 text-sm md:text-base">{p.name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${p.badgeColor}`}>
                            {p.badge}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{p.description}</p>

                        {/* BHK Selector Pills */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Size (BHK)</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[1, 2, 3, 4, 5].map(b => (
                              <button
                                key={b}
                                onClick={() => setBhkSelections(prev => ({ ...prev, [p.id]: b }))}
                                className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${currentBhk === b
                                  ? "bg-emerald-600 border-emerald-600 text-white font-bold"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                              >
                                {b} BHK
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Price & Duration */}
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <span className="text-base font-black text-slate-900">₹{price.toLocaleString("en-IN")}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-semibold">{duration}</span>
                        </div>

                        {/* Includes checklist */}
                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                          {p.includes.map(inc => (
                            <li key={inc} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Right side image & add button */}
                      <div className="w-full md:w-36 flex flex-col items-center justify-center shrink-0">
                        <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] bg-white/95 backdrop-blur border border-slate-200/50 rounded-xl py-1 shadow-sm flex items-center justify-center">
                            {count > 0 ? (
                              <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-emerald-700">
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => removeItemFromCart(cartId)}>-</button>
                                <span>{count}</span>
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => addItemToCart(cartId, cartName, price, duration)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="w-full text-center text-xs font-extrabold text-emerald-700 uppercase tracking-wider py-0.5 flex items-center justify-center gap-1 cursor-pointer"
                                onClick={() => addItemToCart(cartId, cartName, price, duration)}
                              >
                                <ShoppingCart size={11} className="shrink-0" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

            {/* Book by room list (for Cleaning) */}
            {normalizedKey === "cleaning" && activeSubTab === "Book by Room" &&
              bookByRoomPlans
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => {
                  const cartId = `clean-room-${p.id}`;
                  const count = getCartItemCount(cartId);

                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex-1 space-y-3">
                        <h4 className="font-extrabold text-slate-900 text-sm md:text-base">{p.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{p.description}</p>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-base font-black text-slate-900">₹{p.price}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-semibold">{p.duration}</span>
                        </div>

                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          {p.includes.map(inc => (
                            <li key={inc} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="w-full md:w-36 flex flex-col items-center justify-center shrink-0">
                        <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] bg-white/95 backdrop-blur border border-slate-200/50 rounded-xl py-1 shadow-sm flex items-center justify-center">
                            {count > 0 ? (
                              <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-emerald-700">
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => removeItemFromCart(cartId)}>-</button>
                                <span>{count}</span>
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => addItemToCart(cartId, p.name, p.price, p.duration)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="w-full text-center text-xs font-extrabold text-emerald-700 uppercase tracking-wider py-0.5 flex items-center justify-center gap-1 cursor-pointer"
                                onClick={() => addItemToCart(cartId, p.name, p.price, p.duration)}
                              >
                                <ShoppingCart size={11} className="shrink-0" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

            {/* Mini services list (for Cleaning) */}
            {normalizedKey === "cleaning" && activeSubTab === "Mini Services" &&
              miniServicesPlans
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => {
                  const cartId = `clean-mini-${p.id}`;
                  const count = getCartItemCount(cartId);

                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex-1 space-y-3">
                        <h4 className="font-extrabold text-slate-900 text-sm md:text-base">{p.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{p.description}</p>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-base font-black text-slate-900">₹{p.price}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-semibold">{p.duration}</span>
                        </div>

                        <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          {p.includes.map(inc => (
                            <li key={inc} className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="w-full md:w-36 flex flex-col items-center justify-center shrink-0">
                        <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] bg-white/95 backdrop-blur border border-slate-200/50 rounded-xl py-1 shadow-sm flex items-center justify-center">
                            {count > 0 ? (
                              <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-emerald-700">
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => removeItemFromCart(cartId)}>-</button>
                                <span>{count}</span>
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => addItemToCart(cartId, p.name, p.price, p.duration)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="w-full text-center text-xs font-extrabold text-emerald-700 uppercase tracking-wider py-0.5 flex items-center justify-center gap-1 cursor-pointer"
                                onClick={() => addItemToCart(cartId, p.name, p.price, p.duration)}
                              >
                                <ShoppingCart size={11} className="shrink-0" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

            {/* Standard non-cleaning Home Services cards (HVAC, Electrical, Plumbing, Carpentry, Painting, Pest Control, Transport) */}
            {normalizedKey !== "cleaning" &&
              currentOtherPlans
                .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => {
                  const cartId = `serv-${normalizedKey}-${p.id}`;
                  const count = getCartItemCount(cartId);

                  return (
                    <div
                      key={p.id}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-sm md:text-base">{p.name}</h4>
                          {p.badge && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${p.badgeColor || "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                              {p.badge}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">{p.description}</p>

                        {/* Price & Duration */}
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <span className="text-base font-black text-slate-900">₹{p.price.toLocaleString("en-IN")}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-semibold">{p.duration}</span>
                        </div>

                        {/* Includes checklist */}
                        {p.includes && p.includes.length > 0 && (
                          <ul className="text-xs text-slate-600 space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                            {p.includes.map(inc => (
                              <li key={inc} className="flex items-start gap-2">
                                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                <span>{inc}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Right side image & floating ADD button */}
                      <div className="w-full md:w-36 flex flex-col items-center justify-center shrink-0">
                        <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                          <img
                            src={p.image}
                            alt={p.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop";
                            }}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[85%] bg-white/95 backdrop-blur border border-slate-200/50 rounded-xl py-1 shadow-sm flex items-center justify-center">
                            {count > 0 ? (
                              <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-emerald-700">
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => removeItemFromCart(cartId)}>-</button>
                                <span>{count}</span>
                                <button className="px-2 py-0.5 hover:bg-slate-100 rounded cursor-pointer" onClick={() => addItemToCart(cartId, p.name, p.price, p.duration)}>+</button>
                              </div>
                            ) : (
                              <button
                                className="w-full text-center text-xs font-extrabold text-emerald-700 uppercase tracking-wider py-0.5 flex items-center justify-center gap-1 cursor-pointer"
                                onClick={() => addItemToCart(cartId, p.name, p.price, p.duration)}
                              >
                                <ShoppingCart size={11} className="shrink-0" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Right Column: Checkout, VIP banner & Order Summary */}
        <div className={rightColumnClass}>
          <div className="space-y-4">
            {/* Order Summary box */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
                <span className="text-[10px] font-bold text-slate-400">{cart.length} items</span>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-xs gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.duration}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          <button onClick={() => removeItemFromCart(item.id)} className="hover:text-emerald-600 cursor-pointer">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => addItemToCart(item.id, item.name, item.price, item.duration)} className="hover:text-emerald-600 cursor-pointer">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No services added. Select from the packages on the left.
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                {cart.length > 0 && (
                  <>
                    <div className="flex justify-between text-slate-500">
                      <span>Items Subtotal</span>
                      <span>₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    {isVipJoined && (
                      <div className="flex justify-between text-slate-500">
                        <span>VIP Yearly Fee</span>
                        <span>₹299</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-amber-600 font-semibold">
                        <span>Welcome Discount (10%)</span>
                        <span>-₹{couponDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {vipSavings > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>VIP Member Savings (15%)</span>
                        <span>-₹{vipSavings.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between font-extrabold text-slate-900 text-sm border-t border-dashed border-slate-200 pt-2.5">
                  <span>Total Amount</span>
                  <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Checkout Action */}
          <div className="pt-2">
            <button
              disabled={cart.length === 0}
              onClick={onCheckout}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-center text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Proceed to Schedule
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={wrapperClass} onClick={onClose}>
      {contentMarkup}
    </div>
  );
}

export function BkStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Outfit:wght@400;500;600;700;800;900&display=swap');

      @keyframes bk-spin { to { transform:rotate(360deg); } }
      .spin-icon { animation: bk-spin 0.8s linear infinite; display:inline-block; }

      /* •”••”• Root •”••”• */
      .uc-root {
        min-height: 100vh;
        background: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }

      /* •”••”• Nav •”••”• */
      .uc-nav {
        position: sticky; top:0; z-index:100;
        background: rgba(255,255,255,0.97);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid #e2e8f0;
        padding: 0.65rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .uc-nav-left { display:flex; align-items:center; gap:2rem; }
      .uc-nav-links { display:none; }
      @media (min-width: 900px) {
        .uc-nav-links { display:flex; gap:1.5rem; font-size:0.85rem; font-weight:700; color:#475569; }
        .uc-nav-links span { cursor:pointer; }
        .uc-nav-links span:hover { color:#1e293b; }
      }
      .uc-nav-center {
        display:flex; flex:1; gap:1rem; justify-content:flex-end; margin-right: 1.5rem;
      }
      .uc-location-selector { display:none; position: relative; }
      @media (min-width: 600px) {
        .uc-location-selector {
          display:flex; align-items:center; gap:0.4rem;
          background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px;
          padding:0.4rem 0.75rem; cursor:pointer;
          max-width:200px; position:relative;
        }
      }
      .uc-loc-text { font-size:0.75rem; font-weight:600; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .uc-feature-carousel {
        position: relative;
        width: 100%;
        height: 520px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      }
      .uc-feature-slide {
        position: absolute;
        inset: 0;
      }
      .uc-feature-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .uc-feature-overlay {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 5rem 2rem 2rem;
        background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
        color: white;
      }
      .uc-feature-text h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 2rem;
        margin: 0 0 0.5rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .uc-feature-text p {
        font-size: 1.05rem;
        margin: 0;
        opacity: 0.9;
      }

      /* •”••”• Nav Search Bar •”••”• */
      .uc-nav-search {
        display: flex; align-items: center; gap: 0.5rem;
        background: #f8fafc; border: 1.5px solid #e2e8f0;
        border-radius: 10px; padding: 0.42rem 0.85rem;
        width: 260px; transition: border-color 0.2s, box-shadow 0.2s;
        flex-shrink: 0;
      }
      .uc-nav-search:focus-within {
        border-color: #7C3AED40; box-shadow: 0 0 0 3px #7C3AED12;
      }
      .uc-nav-search input {
        border: none; background: transparent; outline: none;
        font-size: 0.8rem; width: 100%; color: #1e293b;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .uc-nav-search input::placeholder { color: #94a3b8; }
      .uc-nav-right-icons { display:flex; align-items:center; gap:1.25rem; height:100%; }
      .uc-cart-icon, .uc-profile-icon {
        position:relative; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        width:36px; height:36px;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .uc-cart-icon:hover, .uc-profile-icon:hover { background: #f1f5f9; }
      .uc-cart-badge {
        position:absolute; top:-4px; right:-6px;
        background:#ef4444; color:white; font-size:0.6rem; font-weight:800;
        width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        line-height:1;
      }
      .uc-nav-summary {
        background: rgba(255,255,255,0.95); border-bottom: 1px solid #e2e8f0;
        padding: 0.5rem 1.5rem; position: sticky; top: 60px; z-index: 99;
      }

      /* •”••”• Progress •”••”• */
      .uc-progress-wrap {
        background: white;
        border-bottom: 1px solid #f1f5f9;
        padding: 0.5rem 1.5rem 0.6rem;
      }
      .uc-stepbar-scroll {
        overflow-x: auto;
        scrollbar-width: none;
        margin-top: 0.5rem;
      }
      .uc-stepbar-scroll::-webkit-scrollbar { display:none; }
      .uc-stepbar {
        display: flex;
        align-items: center;
        gap: 0;
        min-width: max-content;
        max-width: 680px;
        margin: 0 auto;
      }
      .uc-sb-step {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        opacity: 0.4;
        transition: opacity 0.3s;
      }
      .uc-sb-step.uc-sb-done, .uc-sb-step.uc-sb-active { opacity:1; }
      .uc-sb-dot {
        width: 22px; height:22px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #64748b;
        font-size: 0.65rem;
        font-weight: 800;
        display: flex; align-items:center; justify-content:center;
        transition: all 0.3s;
      }
      .uc-sb-done .uc-sb-dot { background:#7C3AED; color:white; }
      .uc-sb-active .uc-sb-dot { background:#7C3AED; color:white; box-shadow:0 0 0 3px #7C3AED30; }
      .uc-sb-label {
        font-size: 0.65rem;
        font-weight: 700;
        color: #64748b;
        white-space: nowrap;
      }
      .uc-sb-active .uc-sb-label { color:#7C3AED; }
      .uc-sb-done .uc-sb-label  { color:#7C3AED; }
      .uc-sb-line {
        flex: 1; height:2px;
        background: #e2e8f0;
        margin: 0 0.4rem;
        min-width: 20px;
        transition: background 0.4s;
      }
      .uc-sb-line-done { background: #7C3AED; }

      /* •”••”• Main •”••”• */
      .uc-main {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #e2e8f0 transparent;
        background: #f8fafc;
      }
      .uc-step-container {
        max-width: 550px;
        margin: 2.5rem auto;
        padding: 2.5rem 2.25rem 3.5rem;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      }

      .uc-home-wrapper {
        display: flex;
        flex-direction: column;
      }
      .uc-home-right { display: none; }
      @media (min-width: 768px) {
        .uc-home-wrapper {
          flex-direction: row;
          width: 100%;
          margin: 0;
          align-items: stretch;
          gap: 3rem;
          padding-right: 2rem;
        }
        .uc-home-left { flex: 1.2; min-width: 0; }
        .uc-home-right {
          display: block;
          flex: 0.8;
          padding-top: 4rem;
        }
      }
      .uc-hc-img-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        position: sticky;
        top: 100px;
      }
      .uc-hc-img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
      .uc-hc-img-large {
        grid-column: span 2;
        height: 240px;
      }
      .uc-hc-badge {
        position: absolute;
        top: -15px; left: -15px;
        background: white;
        padding: 0.5rem 1rem;
        border-radius: 99px;
        font-weight: 800;
        font-size: 0.8rem;
        color: #1e293b;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        z-index: 10;
        border: 1px solid #f1f5f9;
      }

      /* •”••”• HERO •”••”• */
      .uc-hero {
        background: transparent;
        position: relative;
        overflow: hidden;
        padding: 4rem 1.5rem 3.5rem;
      }
      .uc-hero::before { display: none; }
      .uc-hero-inner {
        position: relative;
        max-width: 100%;
        margin: 0;
        text-align: left;
        z-index: 1;
      }
      .uc-hero-tag {
        display:inline-block;
        font-size: 0.85rem;
        font-weight: 700;
        color: #475569;
        margin-bottom: 1rem;
      }
      .uc-hero-h1 {
        font-family: 'Outfit', sans-serif;
        font-size: clamp(2rem, 5vw, 3.2rem);
        font-weight: 900;
        color: #0f172a;
        line-height: 1.15;
        margin: 0 0 1rem;
        letter-spacing: -0.02em;
      }
      .uc-hero-rotate {
        display: inline-block;
        color: #7C3AED;
      }
      .uc-hero-sub {
        color: #64748b;
        font-size: 0.95rem;
        font-weight: 500;
        margin-bottom: 2rem;
      }

      /* •”••”• Search •”••”• */
      .uc-search-bar {
        position: relative;
        max-width: 560px;
        margin: 0 0 1.5rem;
      }
      .uc-search-icon {
        position:absolute; left:1.1rem; top:50%;
        transform:translateY(-50%);
        color: #94a3b8;
        pointer-events:none;
      }
      .uc-search-input {
        width:100%; box-sizing:border-box;
        background: #f8fafc;
        border: none;
        border-radius: 16px;
        padding: 1rem 3rem 1rem 3.2rem;
        font-size: 0.95rem;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        outline: none;
        box-shadow: none;
      }
      .uc-search-clear {
        position:absolute; right:1rem; top:50%;
        transform:translateY(-50%);
        background:none; border:none; cursor:pointer;
        color:#94a3b8; display:flex; align-items:center;
      }
      .uc-trust-row {
        display:flex; align-items:center; justify-content:flex-start;
        flex-wrap:wrap; gap:0.5rem 1.25rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: #475569;
      }
      .uc-trust-row span {
        display:flex; align-items:center; gap:0.3rem;
      }

      /* •”••”• Category Grid •”••”• */
      .uc-section {
        width: 100%;
        padding: 2.5rem 1.5rem;
      }
      .uc-section-header { margin-bottom: 1.5rem; }
      .uc-section-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.6rem;
        font-weight: 900;
        color: #1e293b;
        margin: 0 0 0.3rem;
        letter-spacing: -0.02em;
      }
      .uc-section-sub {
        font-size: 0.88rem;
        color: #64748b;
        font-weight: 500;
        margin: 0 0 1rem;
      }
      .uc-cat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1.25rem;
      }
      .uc-cat-card {
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #f1f5f9;
        border-radius: 16px;
        padding: 0;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
      }
      .uc-cat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.12);
        border-color: #e2e8f0;
      }
      .uc-cat-img-wrap {
        position: relative;
        width: 100%;
        height: 130px;
        overflow: hidden;
      }
      .uc-cat-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .uc-cat-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.25s;
      }
      .uc-cat-card:hover .uc-cat-overlay {
        opacity: 1;
      }
      .uc-cat-btn {
        background: white; color: #1e293b;
        font-weight: 700; font-size: 0.85rem;
        padding: 0.6rem 1.4rem; border-radius: 99px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateY(15px); transition: transform 0.25s;
      }
      .uc-cat-card:hover .uc-cat-btn {
        transform: translateY(0);
      }
      .uc-cat-body { padding: 1.25rem; width: 100%; box-sizing: border-box; }
      .uc-cat-name { font-size:0.92rem; font-weight:800; color:#1e293b; margin-bottom:0.2rem; }
      .uc-cat-desc { font-size:0.72rem; color:#64748b; margin-bottom:0.35rem; }
      .uc-cat-meta { display:flex; align-items:center; gap:0.75rem; }
      .uc-cat-jobs { font-size:0.65rem; color:#94a3b8; font-weight:600; }
      .uc-cat-arrow { color:#cbd5e1; flex-shrink:0; }
      .uc-cat-card:hover .uc-cat-arrow { color:#7C3AED; }

      /* •”••”• How It Works •”••”• */
      .uc-how {
        background: linear-gradient(135deg, #faf5ff, #f0fdf4);
        padding: 3rem 1.5rem;
      }
      .uc-how-grid {
        display:grid;
        grid-template-columns: repeat(auto-fit, minmax(240px,1fr));
        gap:1.5rem;
        max-width:900px;
        margin:1.5rem auto 0;
      }
      .uc-how-card {
        background:white;
        border-radius:24px;
        padding:2.5rem 1.5rem;
        text-align:center;
        box-shadow:0 10px 40px rgba(0,0,0,0.04);
        position:relative;
        transition: transform 0.2s;
      }
      .uc-how-card:hover { transform: translateY(-4px); }
      .uc-how-number {
        position:absolute; top:-16px; left:50%; transform:translateX(-50%);
        width:32px; height:32px; border-radius:50%;
        background:#1e293b;
        color:white; font-size:0.9rem; font-weight:900;
        display:flex; align-items:center; justify-content:center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }
      .uc-how-icon-wrapper {
        width: 64px; height: 64px;
        margin: 0 auto 1.25rem;
        border-radius: 16px;
        background: #f8fafc;
        display: flex; align-items: center; justify-content: center;
        color: #7C3AED;
      }
      .uc-how-title { font-size:1.1rem; font-weight:800; color:#1e293b; margin-bottom:0.5rem; }
      .uc-how-desc  { font-size:0.85rem; color:#64748b; line-height:1.6; }

      /* •”••”• Reviews •”••”• */
      .uc-reviews-section {
        padding: 3rem 1.5rem;
        max-width:1200px;
        margin:0 auto;
      }
      .uc-reviews-grid {
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(260px,1fr));
        gap:1.5rem;
        margin-top:1.5rem;
      }
      .uc-review-card {
        background:white;
        border:1px solid #f1f5f9;
        border-radius:20px;
        padding:1.5rem;
        box-shadow:0 10px 30px rgba(0,0,0,0.03);
        position: relative;
      }
      .uc-review-top {
        display:flex; align-items:center; gap:1rem; margin-bottom:1rem;
      }
      .uc-review-avatar-img {
        width: 48px; height: 48px; border-radius: 50%;
        object-fit: cover;
      }
      .uc-review-name { font-weight: 800; color: #1e293b; font-size: 0.95rem; }
      .uc-review-ago { font-size: 0.75rem; color: #94a3b8; margin-top: 0.1rem; }
      .uc-review-text { font-size:0.85rem; color:#475569; line-height:1.6; font-style: italic; }

      /* •”••”• Step Pages •”••”• */
      .uc-step-page {
        display:flex;
        flex-direction:column;
        gap:0;
      }
      .uc-step-back {
        display:inline-flex; align-items:center; gap:0.35rem;
        font-size:0.8rem; font-weight:700; color:#64748b;
        cursor:pointer; margin-bottom:1.25rem;
        transition:color 0.15s;
        width:fit-content;
      }
      .uc-step-back:hover { color:#7C3AED; }
      .uc-step-hero-bar {
        display:flex; align-items:center; gap:1rem;
        border-radius:16px; padding:1.25rem;
        margin-bottom:1.5rem;
        color:white;
      }
      .uc-step-hero-name { font-size:1.1rem; font-weight:800; color:white; margin-bottom:0.25rem; }
      .uc-step-h2 {
        font-family:'Outfit',sans-serif;
        font-size:1.5rem; font-weight:900;
        color:#1e293b; margin:0 0 0.3rem;
        letter-spacing:-0.02em;
      }
      .uc-step-sub { font-size:0.82rem; color:#64748b; margin:0 0 1.5rem; font-weight:500; }

      /* •”••”• Package Cards •”••”• */
      .uc-pkg-grid {
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(220px,1fr));
        gap:1rem;
        margin-bottom:1.5rem;
      }
      .uc-pkg-card {
        background:white;
        border:2px solid #e2e8f0;
        border-radius:18px;
        padding:1.25rem;
        cursor:pointer;
        position:relative;
        transition:all 0.2s ease;
        box-shadow:0 2px 8px rgba(0,0,0,0.04);
      }
      .uc-pkg-card:hover { border-color:#7C3AED; box-shadow:0 8px 24px rgba(124,58,237,0.12); }
      .uc-pkg-card--sel {
        border-color:#7C3AED;
        background:#faf5ff;
        box-shadow:0 8px 28px rgba(124,58,237,0.18);
      }
      .uc-pkg-card--pop { border-color:#7C3AED; }
      .uc-pkg-tag {
        position:absolute; top:-1px; left:50%; transform:translateX(-50%);
        color:white; font-size:0.65rem; font-weight:800;
        padding:3px 12px; border-radius:0 0 10px 10px;
        white-space:nowrap; letter-spacing:0.03em;
      }
      .uc-pkg-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; margin-top:0.25rem; }
      .uc-pkg-name { font-size:0.95rem; font-weight:800; color:#1e293b; margin-bottom:0.25rem; }
      .uc-pkg-dur  { display:flex; align-items:center; gap:0.3rem; font-size:0.68rem; color:#94a3b8; font-weight:600; }
      .uc-pkg-price-col { text-align:right; }
      .uc-pkg-price { font-family:'Outfit',sans-serif; font-size:1.4rem; font-weight:900; color:#7C3AED; line-height:1; }
      .uc-pkg-price-note { font-size:0.62rem; color:#94a3b8; font-weight:600; }
      .uc-pkg-divider { height:1px; background:#f1f5f9; margin:0.75rem 0; }
      .uc-pkg-list { display:flex; flex-direction:column; gap:0.4rem; }
      .uc-pkg-item { display:flex; align-items:flex-start; gap:0.4rem; font-size:0.75rem; font-weight:600; }
      .uc-pkg-yes { color:#059669; }
      .uc-pkg-no  { color:#94a3b8; text-decoration:line-through; }
      .uc-pkg-radio {
        width:20px; height:20px; border-radius:50%;
        border:2px solid #e2e8f0;
        display:flex; align-items:center; justify-content:center;
        margin-top:0.75rem; margin-left:auto;
        transition:border-color 0.2s;
      }
      .uc-pkg-radio--sel { border-color:#7C3AED; background:#7C3AED; }
      .uc-pkg-radio-dot { width:8px; height:8px; border-radius:50%; background:white; }

      /* •”••”• Schedule •”••”• */
      .uc-date-section, .uc-time-section { margin-bottom:1.5rem; }
      .uc-subsection-label {
        display:flex; align-items:center; gap:0.4rem;
        font-size:0.78rem; font-weight:800; color:#475569;
        text-transform:uppercase; letter-spacing:0.04em;
        margin-bottom:0.75rem;
      }
      .uc-date-scroll {
        display:flex; gap:0.5rem; overflow-x:auto;
        scrollbar-width:none; padding-bottom:0.25rem;
      }
      .uc-date-scroll::-webkit-scrollbar { display:none; }
      .uc-date-pill {
        display:flex; flex-direction:column; align-items:center;
        min-width:62px; padding:0.6rem 0.5rem;
        border:2px solid #e2e8f0; border-radius:14px;
        background:white; cursor:pointer;
        font-family:inherit; position:relative;
        transition:all 0.15s ease;
        gap:0.15rem;
      }
      .uc-date-pill:hover { border-color:#7C3AED; }
      .uc-date-pill--sel { border-color:#7C3AED; background:#7C3AED; }
      .uc-date-today-tag {
        position:absolute; top:-9px; left:50%; transform:translateX(-50%);
        background:#10B981; color:white; font-size:0.55rem;
        font-weight:800; padding:1px 6px; border-radius:99px; white-space:nowrap;
      }
      .uc-date-day { font-size:0.65rem; font-weight:700; color:#94a3b8; }
      .uc-date-pill--sel .uc-date-day { color:rgba(255,255,255,0.8); }
      .uc-date-num { font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:900; color:#1e293b; line-height:1; }
      .uc-date-pill--sel .uc-date-num { color:white; }
      .uc-date-mon { font-size:0.6rem; font-weight:700; color:#94a3b8; text-transform:uppercase; }
      .uc-date-pill--sel .uc-date-mon { color:rgba(255,255,255,0.7); }
      .uc-time-group { margin-bottom:1rem; }
      .uc-time-period-label { font-size:0.72rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem; }
      .uc-time-slots { display:flex; flex-wrap:wrap; gap:0.4rem; }
      .uc-time-slot {
        padding:0.45rem 0.85rem;
        border:1.5px solid #e2e8f0;
        border-radius:10px;
        background:white;
        font-size:0.78rem;
        font-weight:600;
        color:#475569;
        cursor:pointer;
        font-family:inherit;
        transition:all 0.15s;
      }
      .uc-time-slot:hover { border-color:#7C3AED; color:#7C3AED; }
      .uc-time-slot--sel { background:#7C3AED; border-color:#7C3AED; color:white; font-weight:700; }

      /* •”••”• Login •”••”• */
      .uc-login-page { padding-top:0.5rem; }
      .uc-login-center { text-align:center; margin-bottom:1.5rem; }
      .uc-login-shield {
        width:72px; height:72px; border-radius:20px;
        background:#7C3AED15;
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 1rem;
      }
      .uc-login-trust-row {
        display:flex; align-items:center; justify-content:center; flex-wrap:wrap;
        gap:0.4rem 0.85rem; margin-bottom:1.5rem;
        font-size:0.68rem; font-weight:700; color:#64748b;
      }
      .uc-login-trust-row span {
        display:flex; align-items:center; gap:0.25rem;
        background:#f8fafc; border:1px solid #e2e8f0;
        border-radius:99px; padding:3px 8px;
      }
      .uc-otp-row { display:flex; gap:0.75rem; justify-content:center; margin:1.5rem 0; }
      .uc-otp-box {
        width: 72px; height: 80px;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        font-family: 'Outfit', sans-serif;
        font-size: 2.2rem; font-weight: 900;
        text-align: center; color: #1e293b;
        outline: none;
        background: #f8fafc;
        transition: all 0.2s;
        caret-color: #7C3AED;
      }
      .uc-otp-box:focus { border-color: #7C3AED; background: white; box-shadow: 0 0 0 4px #7C3AED15; }
      .uc-otp-filled { border-color: #7C3AED; background: #faf5ff; color: #7C3AED; }
      .uc-resend { text-align:center; margin-top:1rem; }
      .uc-dev-banner {
        display:flex; align-items:center; justify-content:center; gap:0.4rem;
        background:#fffbeb; border:1px solid #fde68a;
        border-radius:10px; padding:0.5rem 0.85rem;
        font-size:0.78rem; font-weight:600; color:#92400e;
        margin-bottom:0.75rem;
      }
      .uc-login-success {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        padding:3rem 1rem; gap:0.75rem; text-align:center;
      }
      .uc-success-check {
        width:90px; height:90px; border-radius:50%;
        background:linear-gradient(135deg,#10B981,#059669);
        display:flex; align-items:center; justify-content:center;
        margin-bottom:0.5rem;
      }
      .uc-success-title { font-family:'Outfit',sans-serif; font-size:1.6rem; font-weight:900; color:#1e293b; }
      .uc-success-sub   { font-size:0.88rem; color:#64748b; font-weight:600; }

      /* •”••”• Form •”••”• */
      .uc-form { display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem; }
      .uc-field-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      @media(max-width:560px) { .uc-field-row { grid-template-columns:1fr; } }
      .uc-field { display:flex; flex-direction:column; gap:0.35rem; }
      .uc-label { font-size:0.75rem; font-weight:700; color:#475569; }
      .uc-input-wrap { position:relative; }
      .uc-field-icon {
        position:absolute; left:0.9rem; top:50%;
        transform:translateY(-50%);
        color:#94a3b8; pointer-events:none;
      }
      .uc-input {
        width:100%; box-sizing:border-box;
        background:#f1f5f9;
        border:1.5px solid transparent;
        border-radius:12px;
        padding:0.85rem 1rem 0.85rem 2.75rem;
        font-size:0.9rem;
        font-weight:600;
        font-family:'Plus Jakarta Sans',sans-serif;
        color:#1e293b;
        outline:none;
        transition:all 0.2s;
      }
      .uc-input:focus { border-color:#7C3AED; background:white; box-shadow:0 0 0 4px #7C3AED15; }
      .uc-textarea {
        width:100%; box-sizing:border-box;
        background:#f1f5f9;
        border:1.5px solid transparent;
        border-radius:12px;
        padding:0.85rem 1rem;
        font-size:0.9rem;
        font-weight:600;
        font-family:'Plus Jakarta Sans',sans-serif;
        color:#1e293b;
        outline:none;
        resize:vertical;
        transition:all 0.2s;
      }
      .uc-textarea:focus { border-color:#7C3AED; background:white; box-shadow:0 0 0 4px #7C3AED15; }

      .uc-photo-zone {
        border:2px dashed #e2e8f0;
        border-radius:14px;
        padding:1.5rem;
        cursor:pointer;
        text-align:center;
        display:flex; flex-direction:column; align-items:center; gap:0.5rem;
        transition:border-color 0.2s;
        background:#fafbfc;
      }
      .uc-photo-zone:hover { border-color:#7C3AED; }
      .uc-photo-text { font-size:0.82rem; font-weight:600; color:#475569; }
      .uc-photo-hint { font-size:0.7rem; color:#94a3b8; }
      .uc-photo-preview { position:relative; width:100%; }
      .uc-photo-preview img { width:100%; height:160px; object-fit:cover; border-radius:10px; }
      .uc-photo-change {
        display:flex; align-items:center; gap:0.35rem;
        margin-top:0.5rem; font-size:0.75rem; font-weight:700; color:#7C3AED; cursor:pointer;
        justify-content:center;
      }

      /* •”••”• Confirm •”••”• */
      .uc-confirm-layout {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:1.25rem;
        align-items:start;
      }
      @media(max-width:640px) { .uc-confirm-layout { grid-template-columns:1fr; } }
      .uc-summary-card { background:white; border:1px solid #e2e8f0; border-radius:18px; overflow:hidden; }
      .uc-summary-hero {
        display:flex; align-items:center; gap:1rem;
        padding:1.1rem;
      }
      .uc-summary-body { padding:1rem; display:flex; flex-direction:column; gap:0.5rem; }
      .uc-summary-row {
        display:flex; align-items:flex-start; gap:0.5rem;
        font-size:0.78rem; font-weight:600; color:#475569;
      }
      .uc-price-box { border-top:1px solid #f1f5f9; padding:1rem; }
      .uc-price-row { display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; color:#64748b; margin-bottom:0.4rem; }
      .uc-price-free {}
      .uc-price-total {
        display:flex; justify-content:space-between;
        font-size:1rem; font-weight:900; color:#1e293b;
        border-top:1px solid #e2e8f0; padding-top:0.5rem; margin-top:0.25rem;
      }
      .uc-confirm-includes { display:flex; flex-direction:column; gap:0.6rem; }
      .uc-includes-title { font-size:0.78rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.25rem; }
      .uc-includes-row { display:flex; align-items:flex-start; gap:0.4rem; font-size:0.8rem; color:#475569; font-weight:600; }
      .uc-guarantee-box {
        display:flex; align-items:flex-start; gap:0.75rem;
        background:#faf5ff; border:1px solid #DDD6FE;
        border-radius:12px; padding:0.85rem;
        margin:0.5rem 0;
      }
      .uc-agree {
        display:flex; align-items:flex-start; gap:0.5rem;
        font-size:0.75rem; color:#64748b; cursor:pointer; line-height:1.5;
      }
      .uc-error {
        display:flex; align-items:center; gap:0.4rem;
        background:#fef2f2; border:1px solid #fecaca;
        border-radius:10px; padding:0.6rem 0.85rem;
        font-size:0.78rem; color:#dc2626; font-weight:600;
        margin:0.5rem 0;
      }

      /* •”••”• Success Page •”••”• */
      .uc-success-page {
        max-width:520px;
        margin:3rem auto;
        text-align:center;
        padding:1rem;
        display:flex; flex-direction:column; align-items:center; gap:1rem;
      }
      .uc-success-circle {
        width:100px; height:100px; border-radius:50%;
        background:linear-gradient(135deg,#10B981,#059669);
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 16px 40px rgba(16,185,129,0.35);
      }
      .uc-success-h2 {
        font-family:'Outfit',sans-serif;
        font-size:1.75rem; font-weight:900; color:#1e293b; margin:0;
      }
      .uc-success-desc { font-size:0.88rem; color:#64748b; max-width:340px; }
      .uc-success-ref {
        background:white; border:1px solid #e2e8f0;
        border-radius:16px; padding:1.25rem 2rem;
        box-shadow:0 4px 16px rgba(0,0,0,0.06);
      }
      .uc-success-timeline {
        display:flex; flex-direction:column; gap:0; width:100%;
        background:white; border:1px solid #e2e8f0;
        border-radius:16px; overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,0.04);
      }
      .uc-tl-item {
        display:flex; align-items:center; gap:0.75rem;
        padding:0.75rem 1.25rem;
        border-bottom:1px solid #f8fafc;
        font-size:0.82rem; font-weight:600; color:#94a3b8;
      }
      .uc-tl-item:last-child { border-bottom:none; }
      .uc-tl-done { color:#1e293b; }
      .uc-tl-icon { font-size:1rem; width:24px; text-align:center; }
      .uc-tl-label { flex:1; }

      /* •”••”• Buttons •”••”• */
      .uc-btn-primary {
        display:inline-flex; align-items:center; justify-content:center; gap:0.45rem;
        background:linear-gradient(135deg,#7C3AED,#6d28d9);
        color:white; border:none; border-radius:14px;
        padding:0.85rem 1.75rem;
        font-size:0.9rem; font-weight:800;
        font-family:'Plus Jakarta Sans',sans-serif;
        cursor:pointer; transition:all 0.2s ease;
        box-shadow:0 4px 16px rgba(124,58,237,0.3);
        letter-spacing:-0.01em;
      }
      .uc-btn-primary:hover:not(:disabled) {
        transform:translateY(-2px);
        box-shadow:0 8px 28px rgba(124,58,237,0.4);
        filter:brightness(1.08);
      }
      .uc-btn-primary:active { transform:translateY(0); }
      .uc-btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; box-shadow:none; }
      .uc-btn-full { width:100%; }

      .uc-btn-outline {
        display:inline-flex; align-items:center; gap:0.4rem;
        background:white; color:#7C3AED;
        border:2px solid #7C3AED;
        border-radius:14px; padding:0.75rem 1.5rem;
        font-size:0.88rem; font-weight:700;
        font-family:inherit; cursor:pointer;
        transition:all 0.2s ease;
      }
      .uc-btn-outline:hover { background:#faf5ff; }

      .uc-link {
        background:none; border:none;
        color:#7C3AED; font-weight:700; font-size:inherit;
        font-family:inherit; cursor:pointer; text-decoration:underline;
        padding:0;
      }

      .uc-step-footer { padding-top:0.5rem; }

      /* •”••”• Footer •”••”• */
      .uc-footer {
        background:white; border-top:1px solid #e2e8f0;
        padding:0.75rem 1.5rem;
        display:flex; align-items:center; justify-content:center;
        gap:0.4rem; flex-wrap:wrap;
        font-size:0.72rem; font-weight:600; color:#94a3b8;
      }
      /* •”••”• Package Modal •”••”• */
      .uc-modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 1.5rem;
      }
      .uc-pkg-modal {
        background: white;
        border-radius: 24px;
        width: 100%; max-width: 980px;
        height: 88vh;
        max-height: 88vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      }
      .uc-pkg-modal-close {
        position: absolute; top: 1rem; right: 1rem;
        background: rgba(255,255,255,0.9); border: none;
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; z-index: 10; color: #1e293b;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .uc-pkg-modal-hero {
        position: relative; width: 100%; height: 180px; shrink: 0; flex-shrink: 0;
        border-radius: 24px 24px 0 0; overflow: hidden;
      }
      .uc-pkg-modal-hero img {
        width: 100%; height: 100%; object-fit: cover;
      }
      .uc-pkg-modal-hero-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.2) 100%);
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 1.5rem 2rem; color: white;
      }
      .uc-pkg-modal-hero-overlay h2 { font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin: 0; }
      .uc-pkg-modal-hero-overlay p { margin: 0.2rem 0 0; color: rgba(255,255,255,0.85); font-weight: 500; font-size: 0.95rem; }
      .uc-pkg-modal-split {
        display: flex;
        flex: 1;
        min-height: 0;
        overflow: hidden;
        flex-direction: row;
        background: #f8fafc;
      }
      .uc-pkg-sidebar {
        width: 300px;
        background: white;
        border-right: 1px solid #e2e8f0;
        padding: 2rem;
      }
      .uc-pkg-sidebar-title {
        font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0 0 1.2rem;
      }
      .uc-pkg-related-list {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column; gap: 0.75rem;
      }
      .uc-pkg-sidebar-card {
        display: flex; align-items: center; gap: 12px;
        font-size: 0.85rem; font-weight: 700; color: #475569;
        cursor: pointer; padding: 0.5rem; border-radius: 12px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }
      .uc-pkg-sidebar-img {
        width: 40px; height: 40px; border-radius: 8px; object-fit: cover;
      }
      .uc-pkg-sidebar-card:hover {
        background: white; border-color: #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      }
      .uc-pkg-sidebar-card.uc-pkg-sidebar-active {
        background: #ede9fe; color: #7C3AED; border-color: #ddd6fe; box-shadow: 0 4px 12px rgba(124,58,237,0.1);
      }
      
      .uc-pkg-filter-row {
        display: flex; gap: 0.5rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 4px;
      }
      .uc-pkg-filter-pill {
        background: white; border: 1px solid #e2e8f0; color: #475569;
        padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.8rem; font-weight: 700;
        cursor: pointer; transition: all 0.2s; white-space: nowrap;
      }
      .uc-pkg-filter-pill:hover { background: #f8fafc; border-color: #cbd5e1; }
      .uc-pkg-filter-pill.active { background: #1e293b; color: white; border-color: #1e293b; }

      .uc-pkg-content {
        flex: 1;
        padding: 2rem;
      }
      .uc-pkg-content-title {
        font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0 0 1.5rem;
      }
      .uc-pkg-modal-list {
        display: flex; flex-direction: column; gap: 1rem;
      }
      .uc-pkg-modal-card-h {
        background: white; border-radius: 16px;
        padding: 1.5rem; position: relative;
        border: 1px solid #e2e8f0;
        cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        display: flex; flex-direction: row; align-items: center; justify-content: space-between;
        gap: 1.5rem;
      }
      .uc-pkg-modal-card-h:hover {
        transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.06); border-color: #7C3AED;
      }
      .uc-pkg-modal-card-left { flex: 1; }
      .uc-pkg-modal-tags { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
      .uc-pkg-badge {
        font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;
        color: white; text-transform: uppercase; letter-spacing: 0.05em;
      }
      .popular-badge { background: linear-gradient(135deg, #f59e0b, #d97706); }
      .value-badge { background: linear-gradient(135deg, #10b981, #059669); }
      
      .uc-pkg-modal-card-left h4 { margin: 0 0 0.4rem; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
      .uc-pkg-modal-price-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
      .uc-pkg-modal-price { font-size: 1.4rem; font-weight: 900; color: #7C3AED; }
      .uc-pkg-modal-dur { font-size: 0.85rem; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px; }
      
      .uc-pkg-modal-inc-list { display: flex; flex-direction: column; gap: 0.4rem; }
      .uc-pkg-inc { font-size: 0.85rem; color: #475569; display: flex; align-items: flex-start; gap: 6px; line-height: 1.4; }
      .uc-pkg-inc svg { color: #10B981; flex-shrink: 0; margin-top: 2px; }
      
      .uc-pkg-modal-card-right { flex-shrink: 0; }
      .uc-btn-add { padding: 0.6rem 1.5rem; border-radius: 99px; }

      @media (max-width: 768px) {
        .uc-pkg-modal-split { flex-direction: column; }
        .uc-pkg-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e2e8f0; }
        .uc-pkg-modal-card-h { flex-direction: column; align-items: flex-start; }
        .uc-pkg-modal-card-right { width: 100%; }
        .uc-btn-add { width: 100%; }
      }
      
      .uc-pkg-modal-card-uc {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 1.5rem 0; border-bottom: 1px dashed #e2e8f0; gap: 1rem;
      }
      .uc-pkg-modal-card-uc:last-child { border-bottom: none; }
      
      .uc-uc-section-title {
        font-size: 1.5rem; font-weight: 900; color: #1e293b;
        margin-bottom: 1rem;
      }

      .uc-pkg-modal-card-uc-info { flex: 1; padding-right: 1rem; }
      .uc-pkg-uc-title { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 0.2rem; }
      .uc-pkg-uc-rating { display: flex; align-items: center; font-size: 0.75rem; margin-bottom: 0.5rem; }
      .uc-pkg-uc-price { font-size: 0.85rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem; }
      .uc-pkg-uc-dot { margin: 0 4px; color: #94a3b8; }
      .uc-pkg-uc-includes { margin: 0; padding-left: 1.2rem; margin-bottom: 1rem; color: #475569; font-size: 0.85rem; line-height: 1.5; }
      .uc-pkg-uc-includes li { margin-bottom: 0.25rem; }
      .uc-pkg-uc-view-details { color: #7C3AED; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
      
      .uc-pkg-modal-card-uc-imgbox {
        position: relative; width: 120px; display: flex; flex-direction: column; align-items: center;
      }
      .uc-pkg-uc-img { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; }
      .uc-pkg-uc-add-wrap {
        position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;
        background: white;
      }
      
      .uc-btn-add-swiggy {
        background: white; border: 1px solid #e2e8f0; color: #7C3AED;
        font-weight: 800; padding: 0.4rem 1.8rem; border-radius: 8px;
        cursor: pointer; transition: all 0.2s; 
        text-transform: uppercase; font-size: 0.85rem;
      }
      .uc-btn-add-swiggy:hover { background: #f8fafc; border-color: #cbd5e1; }
      
      .uc-swiggy-qty {
        display: flex; align-items: center; justify-content: space-between;
        background: white; border: 1px solid #7C3AED; color: #7C3AED;
        font-weight: 800; border-radius: 8px; overflow: hidden; width: 90px;
      }
      .uc-swiggy-qty button {
        background: transparent; border: none; color: #7C3AED; padding: 0.4rem 0.8rem;
        cursor: pointer; font-weight: 800; transition: background 0.2s;
      }
      .uc-swiggy-qty button:hover { background: #f3e8ff; }
      
      .uc-pkg-modal-cart-bar {
        position: sticky; bottom: 0; left: 0; right: 0;
        background: white; border-top: 1px solid #e2e8f0;
        padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;
        box-shadow: 0 -10px 30px rgba(0,0,0,0.05); z-index: 10;
        border-radius: 0 0 24px 24px;
      }
      .uc-cart-bar-left { display: flex; flex-direction: column; }
      .uc-cart-bar-items { font-size: 0.8rem; font-weight: 700; color: #64748b; }
      .uc-cart-bar-price { font-size: 1.25rem; font-weight: 900; color: #1e293b; }
      
      .uc-cart-bar-btn {
        background: #7C3AED; color: white; border: none;
        padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 800;
        cursor: pointer; display: flex; align-items: center; gap: 8px;
        transition: background 0.2s;
      }
      .uc-cart-bar-btn:hover { background: #6D28D9; }

      /* ── Premium Modal Styles for Painting & Masonry ── */
      .uc-paint-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: #ffffff;
        display: flex;
        justify-content: center;
        align-items: stretch;
        z-index: 1000;
      }
      .uc-paint-modal {
        position: relative;
        width: 100%;
        height: 100%;
        background: #ffffff;
        border-radius: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: 'Plus Jakarta Sans', sans-serif;
        box-shadow: none;
      }
      .uc-paint-container {
        max-width: 1200px;
        margin: 0 auto;
        width: 100%;
        padding: 0 2rem;
      }
      .uc-paint-header-inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .uc-paint-choices-container {
        max-width: 800px;
        margin: 2.5rem auto 0;
        width: 100%;
      }
      .uc-paint-bottom-bar-inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .uc-paint-header {
        position: sticky;
        top: 0;
        left: 0;
        width: 100%;
        height: 64px;
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        z-index: 100;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        flex-shrink: 0;
      }
      .uc-paint-header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        width: 100%;
      }
      .uc-paint-header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }
      .uc-paint-header-logo {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1rem;
        font-weight: 800;
        color: #0f172a;
        cursor: pointer;
        user-select: none;
      }
      .uc-paint-header-logo svg {
        color: #0d9488;
      }
      .uc-paint-header-nav {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        margin-left: 1.5rem;
      }
      .uc-paint-header-nav-link {
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
        text-decoration: none;
        cursor: pointer;
        transition: color 0.15s ease;
      }
      .uc-paint-header-nav-link:hover {
        color: #0d9488;
      }
      .uc-paint-header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .uc-paint-header-btn-book {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #ffffff;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 0.5rem 1.1rem;
        border-radius: 9999px;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
        transition: opacity 0.15s ease;
      }
      .uc-paint-header-btn-book:hover {
        opacity: 0.9;
      }
      .uc-paint-header-btn-outline {
        background: transparent;
        border: 1px solid #cbd5e1;
        color: #475569;
        font-size: 0.8rem;
        font-weight: 700;
        padding: 0.5rem 1.1rem;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .uc-paint-header-btn-outline:hover {
        background: #f8fafc;
        border-color: #94a3b8;
        color: #1e293b;
      }
      .uc-paint-header-icon-btn {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 6px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .uc-paint-header-icon-btn:hover {
        background: #f1f5f9;
        color: #1e293b;
      }
      .uc-paint-search-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 9999px;
        padding: 0.4rem 0.85rem;
        width: 220px;
        transition: all 0.2s;
      }
      .uc-paint-search-bar:focus-within {
        border-color: #10b981;
        background: #ffffff;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
      }
      .uc-paint-profile-icon {
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        background: #f0fdf4;
        border: 1px solid #dcfce7;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #059669;
        transition: all 0.2s;
      }
      .uc-paint-profile-icon:hover {
        background: #dcfce7;
        transform: scale(1.05);
      }
      .uc-paint-content {
        flex: 1;
        overflow-y: auto;
        padding: 2rem 0 0 0;
        background: #ffffff;
        scroll-behavior: smooth;
      }

      .uc-paint-main-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 2.5rem;
        align-items: start;
        margin-top: 1.5rem;
        isolation: isolate;
      }
      @media (max-width: 1024px) {
        .uc-paint-main-layout {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
      }

      .uc-paint-hero-row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        text-align: left;
        margin-bottom: 1.5rem;
      }
      .uc-paint-sidebar-title {
        font-size: 2.25rem;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.2;
        margin: 0;
        letter-spacing: -0.03em;
      }
      .uc-paint-sidebar-rating {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.9rem;
        font-weight: 700;
        color: #475569;
      }

      /* Top Horizontal Category Navigation */
      .uc-paint-horizontal-nav {
        background: #ffffff;
        border-bottom: 1.5px solid #f1f5f9;
        padding: 0.75rem 1.5rem;
        width: 100%;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .uc-paint-horizontal-nav-list {
        display: flex;
        align-items: flex-start;
        gap: 1.5rem;
        overflow-x: auto;
        scrollbar-width: none; /* Hide scrollbar in Firefox */
        max-width: 100%;
        margin: 0;
      }
      .uc-paint-horizontal-nav-list::-webkit-scrollbar {
        display: none; /* Hide scrollbar in Chrome/Safari/Webkit */
      }
      .uc-paint-tab-btn {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        border: none;
        background: none;
        padding: 0.5rem 0.75rem;
        border-radius: 12px;
        transition: all 0.2s ease;
        text-align: center;
      }
      .uc-paint-tab-btn:hover {
        background: #f8fafc;
      }
      .uc-paint-tab-img {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        object-fit: cover;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }
      .uc-paint-tab-btn:hover .uc-paint-tab-img {
        transform: scale(1.05);
        border-color: #10b981;
      }
      .uc-paint-tab-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: #475569;
        line-height: 1.2;
        max-width: 72px;
        white-space: normal;
      }
      .uc-paint-tab-btn:hover .uc-paint-tab-label {
        color: #0f172a;
      }
      .uc-paint-middle-col {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .uc-paint-right-col {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        position: sticky;
        top: 2rem;
        align-self: start;
      }
      .uc-paint-promise-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
      }
      .uc-paint-promise-title-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 800;
        color: #0f172a;
        font-size: 0.95rem;
        margin-bottom: 1rem;
      }
      .uc-paint-promise-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .uc-paint-promise-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 700;
        color: #475569;
      }
      .uc-paint-cart-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 1.5rem;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);
        text-align: center;
      }
      .uc-paint-cart-card-title {
        font-size: 1rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 1.25rem 0;
        text-align: left;
      }
      .uc-paint-empty-cart-img {
        width: 50px;
        height: 50px;
        margin: 0.5rem auto 1rem;
        opacity: 0.3;
        display: block;
      }
      .uc-paint-empty-cart-text {
        font-size: 0.82rem;
        font-weight: 700;
        color: #94a3b8;
        margin: 0;
      }
      .uc-paint-cart-items {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        margin-bottom: 1.25rem;
        text-align: left;
      }
      .uc-paint-cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0.6rem;
        border-bottom: 1px dashed #f1f5f9;
      }
      .uc-paint-cart-item-info {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }
      .uc-paint-cart-item-name {
        font-size: 0.8rem;
        font-weight: 800;
        color: #1e293b;
      }
      .uc-paint-cart-item-price {
        font-size: 0.78rem;
        font-weight: 800;
        color: #059669;
      }
      .uc-paint-cart-item-qty {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid #10b981;
        border-radius: 8px;
        padding: 0.2rem 0.4rem;
        background: #ffffff;
      }
      .uc-paint-cart-item-qty button {
        border: none;
        background: none;
        color: #10b981;
        font-size: 0.85rem;
        font-weight: 900;
        cursor: pointer;
        padding: 0 0.1rem;
        color: #1e293b;
        min-width: 12px;
        text-align: center;
      }
      .uc-paint-cart-subtotal {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 800;
        font-size: 0.9rem;
        color: #0f172a;
        margin-bottom: 1.25rem;
        padding-top: 0.4rem;
      }
      .uc-paint-cart-checkout-btn {
        width: 100%;
        cursor: pointer;
        border: none;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 0.8rem;
        border-radius: 12px;
        font-weight: 800;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);
        transition: all 0.2s;
      }
      .uc-paint-cart-checkout-btn:hover {
        opacity: 0.95;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.2);
      }
      @media (min-width: 1025px) {
        .uc-paint-bottom-bar {
          display: none !important;
        }
      }

      .uc-paint-recent-projects {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.5rem;
        background: #f8fafc;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        margin-bottom: 2rem;
      }
      .uc-paint-recent-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .uc-paint-avatar-stack {
        display: flex;
        align-items: center;
      }
      .uc-paint-avatar-stack img {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid white;
        margin-left: -10px;
        object-fit: cover;
      }
      .uc-paint-avatar-stack img:first-child {
        margin-left: 0;
      }
      .uc-paint-avatar-badge {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #cbd5e1;
        border: 2px solid white;
        margin-left: -10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 800;
        color: #1e293b;
      }
      .uc-paint-recent-text {
        font-size: 0.85rem;
        font-weight: 700;
        color: #334155;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .uc-paint-recent-text .uc-paint-new-badge {
        background: #4f46e5;
        color: white;
        font-size: 0.6rem;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 6px;
        letter-spacing: 0.02em;
      }
      .uc-paint-recent-btn {
        cursor: pointer;
        background: white;
        border: 1.5px solid #10b981;
        color: #10b981;
        font-size: 0.8rem;
        font-weight: 800;
        padding: 0.45rem 1.25rem;
        border-radius: 10px;
        transition: all 0.2s;
      }
      .uc-paint-recent-btn:hover {
        background: #f0fdf4;
        border-color: #059669;
        color: #059669;
      }
      .uc-paint-list {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .uc-paint-card {
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        transition: all 0.2s;
      }
      .uc-paint-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
      }
      .uc-paint-card-img-box {
        position: relative;
        height: 240px;
        overflow: hidden;
      }
      .uc-paint-card-img-box img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      .uc-paint-card:hover .uc-paint-card-img-box img {
        transform: scale(1.02);
      }
      .uc-paint-card-img-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 1.5rem 1.75rem;
        color: #ffffff;
      }
      .uc-paint-card-overlay-title {
        font-size: 1.4rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.01em;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
      .uc-paint-card-overlay-rating {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.85rem;
        font-weight: 700;
        background: rgba(0,0,0,0.5);
        padding: 4px 10px;
        border-radius: 8px;
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.15);
      }
      .uc-paint-card-body {
        padding: 1.5rem 1.75rem;
      }
      .uc-paint-points {
        list-style: none;
        padding: 0;
        margin: 0 0 1.25rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .uc-paint-point-item {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        font-size: 0.88rem;
        color: #475569;
        line-height: 1.45;
      }
      .uc-paint-point-check {
        color: #10b981;
        margin-top: 3px;
        flex-shrink: 0;
      }
      .uc-paint-show-more {
        cursor: pointer;
        background: none;
        border: none;
        padding: 0;
        font-size: 0.85rem;
        font-weight: 700;
        color: #10b981;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        transition: color 0.2s;
      }
      .uc-paint-show-more:hover {
        color: #059669;
      }
      .uc-paint-expanded-details {
        margin-top: 1.25rem;
        padding-top: 1.25rem;
        border-top: 1px dashed #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        animation: fadeIn 0.2s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .uc-paint-expand-section {
        font-size: 0.82rem;
      }
      .uc-paint-expand-section-title {
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 0.35rem;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.02em;
      }
      .uc-paint-expand-section-content {
        color: #64748b;
        line-height: 1.5;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .uc-paint-tag-pill {
        background: #f1f5f9;
        color: #475569;
        padding: 3px 8px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.75rem;
      }
      .uc-paint-card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1.25rem;
        padding-top: 1.25rem;
        border-top: 1px solid #f1f5f9;
      }
      .uc-paint-card-price {
        font-size: 0.85rem;
        color: #64748b;
        font-weight: 600;
      }
      .uc-paint-card-price-num {
        font-size: 1.3rem;
        color: #0f172a;
        font-weight: 800;
      }
      .uc-paint-action-btn {
        cursor: pointer;
        background: #ffffff;
        border: 1.5px solid #10b981;
        color: #10b981;
        font-size: 0.85rem;
        font-weight: 800;
        padding: 0.6rem 1.75rem;
        border-radius: 12px;
        transition: all 0.2s;
        min-width: 150px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.05);
      }
      .uc-paint-action-btn:hover {
        background: #f0fdf4;
        border-color: #059669;
        color: #059669;
      }
      .uc-paint-qty-selector {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border: 1.5px solid #10b981;
        background: #f0fdf4;
        border-radius: 12px;
        padding: 0.5rem 0.85rem;
        min-width: 150px;
        font-weight: 800;
        color: #059669;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.08);
      }
      .uc-paint-qty-selector button {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1.15rem;
        font-weight: 900;
        color: #059669;
        padding: 0 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .uc-paint-bottom-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1.2rem 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10;
        box-shadow: 0 -6px 25px rgba(5, 150, 105, 0.25);
      }
      .uc-paint-bottom-left {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .uc-paint-bottom-items {
        font-size: 0.8rem;
        opacity: 0.9;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .uc-paint-bottom-total {
        font-size: 1.35rem;
        font-weight: 900;
        letter-spacing: -0.01em;
      }
      .uc-paint-bottom-btn {
        cursor: pointer;
        border: none;
        background: #ffffff;
        color: #059669;
        font-size: 0.92rem;
        font-weight: 800;
        padding: 0.8rem 1.75rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transition: all 0.2s;
      }
      .uc-paint-bottom-btn:hover {
        background: #f8fafc;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      }
      .uc-paint-bottom-btn:active {
        transform: translateY(0);
      }

      /* Estimate Banner & Process Section styles */
      .uc-paint-estimate-banner {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border: 1px solid #bbf7d0;
        border-radius: 24px;
        padding: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        margin-top: 3rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.01);
        text-align: left;
      }
      .uc-paint-estimate-left {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
      .uc-paint-estimate-title {
        font-size: 1.35rem;
        font-weight: 800;
        color: #064e3b;
        margin: 0;
      }
      .uc-paint-estimate-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .uc-paint-estimate-item {
        font-size: 0.88rem;
        font-weight: 600;
        color: #14532d;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .uc-paint-estimate-btn {
        cursor: pointer;
        border: none;
        background: #059669;
        color: white;
        padding: 0.7rem 1.5rem;
        border-radius: 12px;
        font-weight: 800;
        font-size: 0.85rem;
        box-shadow: 0 4px 10px rgba(5, 150, 105, 0.15);
        transition: all 0.2s;
      }
      .uc-paint-estimate-btn:hover {
        background: #047857;
        transform: translateY(-1px);
      }
      .uc-paint-estimate-right {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        width: 90px;
        height: 90px;
        border-radius: 20px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);
        border: 1px solid #e2e8f0;
        position: relative;
        flex-shrink: 0;
      }
      .uc-paint-estimate-badge {
        position: absolute;
        bottom: -5px;
        right: -5px;
        background: #10b981;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }

      .uc-paint-process-section {
        margin-top: 3.5rem;
        padding-bottom: 2rem;
        text-align: left;
      }
      .uc-paint-process-title {
        font-size: 1.35rem;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 2rem;
      }
      .uc-paint-process-steps {
        display: flex;
        flex-direction: column;
        gap: 2.25rem;
      }
      .uc-paint-process-step {
        display: flex;
        align-items: flex-start;
        gap: 1.5rem;
        position: relative;
      }
      .uc-paint-process-step:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 20px;
        top: 40px;
        bottom: -25px;
        width: 2px;
        border-left: 2px dashed #cbd5e1;
      }
      .uc-paint-process-icon-box {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        flex-shrink: 0;
        z-index: 1;
        border: 2px solid #ffffff;
        box-shadow: 0 0 0 1px #e2e8f0;
      }
      .uc-paint-process-info {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding-top: 0.3rem;
      }
      .uc-paint-process-name {
        font-size: 0.95rem;
        font-weight: 800;
        color: #1e293b;
      }
      .uc-paint-process-desc {
        font-size: 0.82rem;
        color: #64748b;
        font-weight: 500;
      }

      /* Sub-options styles */
      .uc-paint-suboptions-section {
        margin-top: 1.25rem;
        padding-top: 1.25rem;
        border-top: 1px solid #f1f5f9;
        text-align: left;
      }
      .uc-paint-suboptions-title {
        font-size: 0.85rem;
        font-weight: 800;
        color: #0f172a;
        display: block;
        margin-bottom: 0.75rem;
      }
      .uc-paint-chips-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .uc-paint-opt-chip {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        border-radius: 12px;
        border: 1.5px solid #e2e8f0;
        background: #ffffff;
        color: #475569;
        font-weight: 700;
        font-size: 0.85rem;
        transition: all 0.2s;
        outline: none;
      }
      .uc-paint-opt-chip:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        transform: translateY(-0.5px);
      }
      .uc-paint-opt-chip.active {
        border-color: #10b981;
        background: #f0fdf4;
        color: #047857;
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.05);
      }
      .uc-paint-chip-status {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #f1f5f9;
        color: #64748b;
        font-size: 0.75rem;
        font-weight: 800;
        transition: all 0.2s;
      }
      .uc-paint-opt-chip.active .uc-paint-chip-status {
        background: #10b981;
        color: white;
      }

      /* App Banner & Main Footer styles */
      .uc-paint-footer-section {
        margin-top: 4rem;
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
        background: #ffffff;
        border-top: 1px solid #f1f5f9;
      }
      .uc-paint-app-banner {
        background: #f0fdf4;
        border-radius: 24px;
        padding: 2.25rem 2.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        margin: 3rem 0;
        border: 1px solid #dcfce7;
        text-align: left;
      }
      @media (max-width: 768px) {
        .uc-paint-app-banner {
          flex-direction: column;
          align-items: flex-start;
          gap: 1.5rem;
          padding: 1.5rem;
        }
      }
      .uc-paint-app-banner-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }
      .uc-paint-app-banner-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
      }
      .uc-paint-app-banner-text {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .uc-paint-app-banner-tag {
        font-size: 0.75rem;
        font-weight: 800;
        color: #059669;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .uc-paint-app-banner-title {
        font-size: 1.25rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
      }
      .uc-paint-app-banner-desc {
        font-size: 0.82rem;
        color: #64748b;
        font-weight: 500;
        margin: 0;
      }
      .uc-paint-app-banner-right {
        display: flex;
        gap: 1rem;
      }
      @media (max-width: 480px) {
        .uc-paint-app-banner-right {
          flex-direction: column;
          width: 100%;
        }
      }
      .uc-paint-store-btn {
        cursor: pointer;
        border: none;
        background: #0f172a;
        color: white;
        padding: 0.8rem 1.5rem;
        border-radius: 12px;
        font-weight: 800;
        font-size: 0.82rem;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        transition: all 0.2s;
        white-space: nowrap;
      }
      .uc-paint-store-btn:hover {
        background: #1e293b;
        transform: translateY(-1px);
      }

      .uc-paint-main-footer {
        background: #0B1225;
        border-top: 1px solid #1E293B;
        padding: 3.5rem 0;
        width: 100%;
      }
      .uc-paint-main-footer-inner {
        display: grid;
        grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
        gap: 3rem;
        text-align: left;
      }
      @media (max-width: 768px) {
        .uc-paint-main-footer-inner {
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
      }
      @media (max-width: 480px) {
        .uc-paint-main-footer-inner {
          grid-template-columns: 1fr;
        }
      }
      .uc-paint-footer-col {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .uc-paint-footer-logo-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .uc-paint-footer-brand {
        font-size: 1.25rem;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.01em;
      }
      .uc-paint-footer-brand-desc {
        font-size: 0.85rem;
        color: #94a3b8;
        line-height: 1.5;
        margin: 0;
        font-weight: 500;
      }
      .uc-paint-footer-socials {
        display: flex;
        gap: 0.75rem;
      }
      .uc-paint-social-icon {
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        transition: all 0.2s;
      }
      .uc-paint-social-icon:hover {
        background: #54B6A6;
        color: white;
        border-color: #54B6A6;
        transform: scale(1.05);
      }
      .uc-paint-footer-col-title {
        font-size: 0.95rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
      }
      .uc-paint-footer-links {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .uc-paint-footer-links li {
        font-size: 0.85rem;
        color: #94a3b8;
        font-weight: 500;
        cursor: pointer;
        transition: color 0.2s;
      }
      .uc-paint-footer-links li:hover {
        color: #54B6A6;
      }
      .uc-paint-footer-contact {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .uc-paint-footer-contact li {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.85rem;
        color: #94a3b8;
        font-weight: 500;
      }
      .uc-paint-footer-contact li svg {
        color: #54B6A6;
      }

      /* Our Painting Standards Styles */
      .uc-paint-standards-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-top: 1rem;
      }
      @media (max-width: 640px) {
        .uc-paint-standards-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 400px) {
        .uc-paint-standards-grid {
          grid-template-columns: repeat(1, 1fr);
        }
      }
      .uc-paint-standard-card {
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.75rem;
        box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        transition: all 0.2s;
        cursor: pointer;
      }
      .uc-paint-standard-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        border-color: #cbd5e1;
      }
      .uc-paint-standard-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
      }

      /* ── Root ── */
      .uc-root {
        min-height: 100vh;
        background: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }

      @keyframes bk-spin { to { transform:rotate(360deg); } }
      .spin-icon { animation: bk-spin 0.8s linear infinite; display:inline-block; }

      /* ── Root ── */
      .uc-root {
        min-height: 100vh;
        background: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }

      /* ── Nav ── */
      .uc-nav {
        position: sticky; top:0; z-index:100;
        background: rgba(255,255,255,0.97);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid #e2e8f0;
        padding: 0.65rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .uc-nav-left { display:flex; align-items:center; gap:2rem; }
      .uc-nav-links { display:none; }
      @media (min-width: 900px) {
        .uc-nav-links { display:flex; gap:1.5rem; font-size:0.85rem; font-weight:700; color:#475569; }
        .uc-nav-links span { cursor:pointer; }
        .uc-nav-links span:hover { color:#1e293b; }
      }
      .uc-nav-center {
        display:flex; flex:1; gap:1rem; justify-content:flex-end; margin-right: 1.5rem;
      }
      .uc-location-selector { display:none; position: relative; }
      @media (min-width: 600px) {
        .uc-location-selector {
          display:flex; align-items:center; gap:0.4rem;
          background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px;
          padding:0.4rem 0.75rem; cursor:pointer;
          max-width:200px; position:relative;
        }
      }
      .uc-loc-text { font-size:0.75rem; font-weight:600; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .uc-feature-carousel {
        position: relative;
        width: 100%;
        height: 520px;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(0,0,0,0.08);
      }
      .uc-feature-slide {
        position: absolute;
        inset: 0;
      }
      .uc-feature-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .uc-feature-overlay {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 5rem 2rem 2rem;
        background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
        color: white;
      }
      .uc-feature-text h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 2rem;
        margin: 0 0 0.5rem;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .uc-feature-text p {
        font-size: 1.05rem;
        margin: 0;
        opacity: 0.9;
      }

      /* ── Nav Search Bar ── */
      .uc-nav-search {
        display: flex; align-items: center; gap: 0.5rem;
        background: #f8fafc; border: 1.5px solid #e2e8f0;
        border-radius: 10px; padding: 0.42rem 0.85rem;
        width: 260px; transition: border-color 0.2s, box-shadow 0.2s;
        flex-shrink: 0;
      }
      .uc-nav-search:focus-within {
        border-color: #7C3AED40; box-shadow: 0 0 0 3px #7C3AED12;
      }
      .uc-nav-search input {
        border: none; background: transparent; outline: none;
        font-size: 0.8rem; width: 100%; color: #1e293b;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .uc-nav-search input::placeholder { color: #94a3b8; }
      .uc-nav-right-icons { display:flex; align-items:center; gap:1.25rem; height:100%; }
      .uc-cart-icon, .uc-profile-icon {
        position:relative; cursor:pointer;
        display:flex; align-items:center; justify-content:center;
        width:36px; height:36px;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .uc-cart-icon:hover, .uc-profile-icon:hover { background: #f1f5f9; }
      .uc-cart-badge {
        position:absolute; top:-4px; right:-6px;
        background:#ef4444; color:white; font-size:0.6rem; font-weight:800;
        width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        line-height:1;
      }
      .uc-nav-summary {
        background: rgba(255,255,255,0.95); border-bottom: 1px solid #e2e8f0;
        padding: 0.5rem 1.5rem; position: sticky; top: 60px; z-index: 99;
      }

      /* ── Progress ── */
      .uc-progress-wrap {
        background: white;
        border-bottom: 1px solid #f1f5f9;
        padding: 0.5rem 1.5rem 0.6rem;
      }
      .uc-stepbar-scroll {
        overflow-x: auto;
        scrollbar-width: none;
        margin-top: 0.5rem;
      }
      .uc-stepbar-scroll::-webkit-scrollbar { display:none; }
      .uc-stepbar {
        display: flex;
        align-items: center;
        gap: 0;
        min-width: max-content;
        max-width: 680px;
        margin: 0 auto;
      }
      .uc-sb-step {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        opacity: 0.4;
        transition: opacity 0.3s;
      }
      .uc-sb-step.uc-sb-done, .uc-sb-step.uc-sb-active { opacity:1; }
      .uc-sb-dot {
        width: 22px; height:22px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #64748b;
        font-size: 0.65rem;
        font-weight: 800;
        display: flex; align-items:center; justify-content:center;
        transition: all 0.3s;
      }
      .uc-sb-done .uc-sb-dot { background:#10B981; color:white; }
      .uc-sb-active .uc-sb-dot { background:#7C3AED; color:white; box-shadow:0 0 0 3px #7C3AED30; }
      .uc-sb-label {
        font-size: 0.65rem;
        font-weight: 700;
        color: #64748b;
        white-space: nowrap;
      }
      .uc-sb-active .uc-sb-label { color:#7C3AED; }
      .uc-sb-done .uc-sb-label  { color:#10B981; }
      .uc-sb-line {
        flex: 1; height:2px;
        background: #e2e8f0;
        margin: 0 0.4rem;
        min-width: 20px;
        transition: background 0.4s;
      }
      .uc-sb-line-done { background: #10B981; }

      /* ── Main ── */
      .uc-main {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #e2e8f0 transparent;
        background: #f8fafc;
      }
      .uc-step-container {
        max-width: 550px;
        margin: 2.5rem auto;
        padding: 2.5rem 2.25rem 3.5rem;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      }

      .uc-home-wrapper {
        display: flex;
        flex-direction: column;
      }
      .uc-home-right { display: none; }
      @media (min-width: 768px) {
        .uc-home-wrapper {
          flex-direction: row;
          width: 100%;
          margin: 0;
          align-items: stretch;
          gap: 3rem;
          padding-right: 2rem;
        }
        .uc-home-left { flex: 1.2; min-width: 0; }
        .uc-home-right {
          display: block;
          flex: 0.8;
          padding-top: 4rem;
        }
      }
      .uc-hc-img-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        position: sticky;
        top: 100px;
      }
      .uc-hc-img {
        width: 100%;
        height: 180px;
        object-fit: cover;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
      .uc-hc-img-large {
        grid-column: span 2;
        height: 240px;
      }
      .uc-hc-badge {
        position: absolute;
        top: -15px; left: -15px;
        background: white;
        padding: 0.5rem 1rem;
        border-radius: 99px;
        font-weight: 800;
        font-size: 0.8rem;
        color: #1e293b;
        box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        z-index: 10;
        border: 1px solid #f1f5f9;
      }

      /* ── HERO ── */
      .uc-hero {
        background: transparent;
        position: relative;
        overflow: hidden;
        padding: 4rem 1.5rem 3.5rem;
      }
      .uc-hero::before { display: none; }
      .uc-hero-inner {
        position: relative;
        max-width: 100%;
        margin: 0;
        text-align: left;
        z-index: 1;
      }
      .uc-hero-tag {
        display:inline-block;
        font-size: 0.85rem;
        font-weight: 700;
        color: #475569;
        margin-bottom: 1rem;
      }
      .uc-hero-h1 {
        font-family: 'Outfit', sans-serif;
        font-size: clamp(2rem, 5vw, 3.2rem);
        font-weight: 900;
        color: #0f172a;
        line-height: 1.15;
        margin: 0 0 1rem;
        letter-spacing: -0.02em;
      }
      .uc-hero-rotate {
        display: inline-block;
        color: #7C3AED;
      }
      .uc-hero-sub {
        color: #64748b;
        font-size: 0.95rem;
        font-weight: 500;
        margin-bottom: 2rem;
      }

      /* ── Search ── */
      .uc-search-bar {
        position: relative;
        max-width: 560px;
        margin: 0 0 1.5rem;
      }
      .uc-search-icon {
        position:absolute; left:1.1rem; top:50%;
        transform:translateY(-50%);
        color: #94a3b8;
        pointer-events:none;
      }
      .uc-search-input {
        width:100%; box-sizing:border-box;
        background: #f8fafc;
        border: none;
        border-radius: 16px;
        padding: 1rem 3rem 1rem 3.2rem;
        font-size: 0.95rem;
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #1e293b;
        outline: none;
        box-shadow: none;
      }
      .uc-search-clear {
        position:absolute; right:1rem; top:50%;
        transform:translateY(-50%);
        background:none; border:none; cursor:pointer;
        color:#94a3b8; display:flex; align-items:center;
      }
      .uc-trust-row {
        display:flex; align-items:center; justify-content:flex-start;
        flex-wrap:wrap; gap:0.5rem 1.25rem;
        font-size: 0.72rem;
        font-weight: 700;
        color: #475569;
      }
      .uc-trust-row span {
        display:flex; align-items:center; gap:0.3rem;
      }

      /* ── Category Grid ── */
      .uc-section {
        width: 100%;
        padding: 2.5rem 1.5rem;
      }
      .uc-section-header { margin-bottom: 1.5rem; }
      .uc-section-title {
        font-family: 'Outfit', sans-serif;
        font-size: 1.6rem;
        font-weight: 900;
        color: #1e293b;
        margin: 0 0 0.3rem;
        letter-spacing: -0.02em;
      }
      .uc-section-sub {
        font-size: 0.88rem;
        color: #64748b;
        font-weight: 500;
        margin: 0 0 1rem;
      }
      .uc-cat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1.25rem;
      }
      .uc-cat-card {
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #f1f5f9;
        border-radius: 16px;
        padding: 0;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        overflow: hidden;
      }
      .uc-cat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.12);
        border-color: #e2e8f0;
      }
      .uc-cat-img-wrap {
        position: relative;
        width: 100%;
        height: 130px;
        overflow: hidden;
      }
      .uc-cat-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .uc-cat-overlay {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.25s;
      }
      .uc-cat-card:hover .uc-cat-overlay {
        opacity: 1;
      }
      .uc-cat-btn {
        background: white; color: #1e293b;
        font-weight: 700; font-size: 0.85rem;
        padding: 0.6rem 1.4rem; border-radius: 99px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateY(15px); transition: transform 0.25s;
      }
      .uc-cat-card:hover .uc-cat-btn {
        transform: translateY(0);
      }
      .uc-cat-body { padding: 1.25rem; width: 100%; box-sizing: border-box; }
      .uc-cat-name { font-size:0.92rem; font-weight:800; color:#1e293b; margin-bottom:0.2rem; }
      .uc-cat-desc { font-size:0.72rem; color:#64748b; margin-bottom:0.35rem; }
      .uc-cat-meta { display:flex; align-items:center; gap:0.75rem; }
      .uc-cat-jobs { font-size:0.65rem; color:#94a3b8; font-weight:600; }
      .uc-cat-arrow { color:#cbd5e1; flex-shrink:0; }
      .uc-cat-card:hover .uc-cat-arrow { color:#7C3AED; }

      /* ── How It Works ── */
      .uc-how {
        background: linear-gradient(135deg, #faf5ff, #f0fdf4);
        padding: 3rem 1.5rem;
      }
      .uc-how-grid {
        display:grid;
        grid-template-columns: repeat(auto-fit, minmax(240px,1fr));
        gap:1.5rem;
        max-width:900px;
        margin:1.5rem auto 0;
      }
      .uc-how-card {
        background:white;
        border-radius:24px;
        padding:2.5rem 1.5rem;
        text-align:center;
        box-shadow:0 10px 40px rgba(0,0,0,0.04);
        position:relative;
        transition: transform 0.2s;
      }
      .uc-how-card:hover { transform: translateY(-4px); }
      .uc-how-number {
        position:absolute; top:-16px; left:50%; transform:translateX(-50%);
        width:32px; height:32px; border-radius:50%;
        background:#1e293b;
        color:white; font-size:0.9rem; font-weight:900;
        display:flex; align-items:center; justify-content:center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
      }
      .uc-how-icon-wrapper {
        width: 64px; height: 64px;
        margin: 0 auto 1.25rem;
        border-radius: 16px;
        background: #f8fafc;
        display: flex; align-items: center; justify-content: center;
        color: #7C3AED;
      }
      .uc-how-title { font-size:1.1rem; font-weight:800; color:#1e293b; margin-bottom:0.5rem; }
      .uc-how-desc  { font-size:0.85rem; color:#64748b; line-height:1.6; }

      /* ── Reviews ── */
      .uc-reviews-section {
        padding: 3rem 1.5rem;
        max-width:1200px;
        margin:0 auto;
      }
      .uc-reviews-grid {
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(260px,1fr));
        gap:1.5rem;
        margin-top:1.5rem;
      }
      .uc-review-card {
        background:white;
        border:1px solid #f1f5f9;
        border-radius:20px;
        padding:1.5rem;
        box-shadow:0 10px 30px rgba(0,0,0,0.03);
        position: relative;
      }
      .uc-review-top {
        display:flex; align-items:center; gap:1rem; margin-bottom:1rem;
      }
      .uc-review-avatar-img {
        width: 48px; height: 48px; border-radius: 50%;
        object-fit: cover;
      }
      .uc-review-name { font-weight: 800; color: #1e293b; font-size: 0.95rem; }
      .uc-review-ago { font-size: 0.75rem; color: #94a3b8; margin-top: 0.1rem; }
      .uc-review-text { font-size:0.85rem; color:#475569; line-height:1.6; font-style: italic; }

      /* ── Step Pages ── */
      .uc-step-container {
        max-width: 680px;
        margin: 1.5rem auto 3rem;
        padding: 2.25rem 2.5rem;
        background: white;
        border-radius: 24px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03);
        border: 1px solid #f1f5f9;
      }
      .uc-step-page {
        display:flex;
        flex-direction:column;
        gap:0;
      }
      .uc-step-back {
        display:inline-flex; align-items:center; gap:0.35rem;
        font-size:0.8rem; font-weight:700; color:#64748b;
        cursor:pointer; margin-bottom:1.25rem;
        transition:color 0.15s;
        width:fit-content;
      }
      .uc-step-back:hover { color:#7C3AED; }
      .uc-step-hero-bar {
        display:flex; align-items:center; gap:1rem;
        border-radius:16px; padding:1.25rem;
        margin-bottom:1.5rem;
        color:white;
      }
      .uc-step-hero-name { font-size:1.1rem; font-weight:800; color:white; margin-bottom:0.25rem; }
      .uc-step-h2 {
        font-family:'Outfit',sans-serif;
        font-size:1.5rem; font-weight:900;
        color:#1e293b; margin:0 0 0.3rem;
        letter-spacing:-0.02em;
      }
      .uc-step-sub { font-size:0.82rem; color:#64748b; margin:0 0 1.5rem; font-weight:500; }

      /* ── Package Cards ── */
      .uc-pkg-grid {
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(220px,1fr));
        gap:1rem;
        margin-bottom:1.5rem;
      }
      .uc-pkg-card {
        background:white;
        border:2px solid #e2e8f0;
        border-radius:18px;
        padding:1.25rem;
        cursor:pointer;
        position:relative;
        transition:all 0.2s ease;
        box-shadow:0 2px 8px rgba(0,0,0,0.04);
      }
      .uc-pkg-card:hover { border-color:#7C3AED; box-shadow:0 8px 24px rgba(124,58,237,0.12); }
      .uc-pkg-card--sel {
        border-color:#7C3AED;
        background:#faf5ff;
        box-shadow:0 8px 28px rgba(124,58,237,0.18);
      }
      .uc-pkg-card--pop { border-color:#7C3AED; }
      .uc-pkg-tag {
        position:absolute; top:-1px; left:50%; transform:translateX(-50%);
        color:white; font-size:0.65rem; font-weight:800;
        padding:3px 12px; border-radius:0 0 10px 10px;
        white-space:nowrap; letter-spacing:0.03em;
      }
      .uc-pkg-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; margin-top:0.25rem; }
      .uc-pkg-name { font-size:0.95rem; font-weight:800; color:#1e293b; margin-bottom:0.25rem; }
      .uc-pkg-dur  { display:flex; align-items:center; gap:0.3rem; font-size:0.68rem; color:#94a3b8; font-weight:600; }
      .uc-pkg-price-col { text-align:right; }
      .uc-pkg-price { font-family:'Outfit',sans-serif; font-size:1.4rem; font-weight:900; color:#7C3AED; line-height:1; }
      .uc-pkg-price-note { font-size:0.62rem; color:#94a3b8; font-weight:600; }
      .uc-pkg-divider { height:1px; background:#f1f5f9; margin:0.75rem 0; }
      .uc-pkg-list { display:flex; flex-direction:column; gap:0.4rem; }
      .uc-pkg-item { display:flex; align-items:flex-start; gap:0.4rem; font-size:0.75rem; font-weight:600; }
      .uc-pkg-yes { color:#059669; }
      .uc-pkg-no  { color:#94a3b8; text-decoration:line-through; }
      .uc-pkg-radio {
        width:20px; height:20px; border-radius:50%;
        border:2px solid #e2e8f0;
        display:flex; align-items:center; justify-content:center;
        margin-top:0.75rem; margin-left:auto;
        transition:border-color 0.2s;
      }
      .uc-pkg-radio--sel { border-color:#7C3AED; background:#7C3AED; }
      .uc-pkg-radio-dot { width:8px; height:8px; border-radius:50%; background:white; }

      /* ── Schedule ── */
      .uc-date-section, .uc-time-section { margin-bottom:1.5rem; }
      .uc-subsection-label {
        display:flex; align-items:center; gap:0.4rem;
        font-size:0.78rem; font-weight:800; color:#475569;
        text-transform:uppercase; letter-spacing:0.04em;
        margin-bottom:0.75rem;
      }
      .uc-date-scroll {
        display:flex; gap:0.65rem; overflow-x:auto;
        scrollbar-width:none;
        padding: 14px 6px 12px;
        scroll-behavior: smooth;
      }
      .uc-date-scroll::-webkit-scrollbar { display:none; }
      .uc-date-pill {
        display:flex; flex-direction:column; align-items:center;
        min-width:68px; padding:0.65rem 0.5rem;
        border:2px solid #e2e8f0; border-radius:14px;
        background:white; cursor:pointer;
        font-family:inherit; position:relative;
        transition:all 0.15s ease;
        gap:0.15rem; flex-shrink:0;
      }
      .uc-date-pill:hover { border-color:#7C3AED; }
      .uc-date-pill--sel { border-color:#7C3AED; background:#7C3AED; }
      .uc-date-today-tag {
        position:absolute; top:-10px; left:50%; transform:translateX(-50%);
        background:#10B981; color:white; font-size:0.58rem;
        font-weight:800; padding:2px 8px; border-radius:99px; white-space:nowrap;
        box-shadow:0 2px 5px rgba(16,185,129,0.3);
      }
      .uc-date-day { font-size:0.65rem; font-weight:700; color:#94a3b8; }
      .uc-date-pill--sel .uc-date-day { color:rgba(255,255,255,0.8); }
      .uc-date-num { font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:900; color:#1e293b; line-height:1; }
      .uc-date-pill--sel .uc-date-num { color:white; }
      .uc-date-mon { font-size:0.6rem; font-weight:700; color:#94a3b8; text-transform:uppercase; }
      .uc-date-pill--sel .uc-date-mon { color:rgba(255,255,255,0.7); }
      .uc-time-group { margin-bottom:1rem; }
      .uc-time-period-label { font-size:0.72rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.5rem; }
      .uc-time-slots { display:flex; flex-wrap:wrap; gap:0.4rem; }
      .uc-time-slot {
        padding:0.45rem 0.85rem;
        border:1.5px solid #e2e8f0;
        border-radius:10px;
        background:white;
        font-size:0.78rem;
        font-weight:600;
        color:#475569;
        cursor:pointer;
        font-family:inherit;
        transition:all 0.15s;
      }
      .uc-time-slot:hover { border-color:#7C3AED; color:#7C3AED; }
      .uc-time-slot--sel { background:#7C3AED; border-color:#7C3AED; color:white; font-weight:700; }

      /* ── Login ── */
      .uc-login-page { padding-top:0.5rem; }
      .uc-login-center { text-align:center; margin-bottom:1.5rem; }
      .uc-login-shield {
        width:72px; height:72px; border-radius:20px;
        background:#7C3AED15;
        display:flex; align-items:center; justify-content:center;
        margin:0 auto 1rem;
      }
      .uc-login-trust-row {
        display:flex; align-items:center; justify-content:center; flex-wrap:wrap;
        gap:0.4rem 0.85rem; margin-bottom:1.5rem;
        font-size:0.68rem; font-weight:700; color:#64748b;
      }
      .uc-login-trust-row span {
        display:flex; align-items:center; gap:0.25rem;
        background:#f8fafc; border:1px solid #e2e8f0;
        border-radius:99px; padding:3px 8px;
      }
      .uc-otp-row { display:flex; gap:0.75rem; justify-content:center; margin:1.5rem 0; }
      .uc-otp-box {
        width: 72px; height: 80px;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        font-family: 'Outfit', sans-serif;
        font-size: 2.2rem; font-weight: 900;
        text-align: center; color: #1e293b;
        outline: none;
        background: #f8fafc;
        transition: all 0.2s;
        caret-color: #7C3AED;
      }
      .uc-otp-box:focus { border-color: #7C3AED; background: white; box-shadow: 0 0 0 4px #7C3AED15; }
      .uc-otp-filled { border-color: #7C3AED; background: #faf5ff; color: #7C3AED; }
      .uc-resend { text-align:center; margin-top:1rem; }
      .uc-dev-banner {
        display:flex; align-items:center; justify-content:center; gap:0.4rem;
        background:#fffbeb; border:1px solid #fde68a;
        border-radius:10px; padding:0.5rem 0.85rem;
        font-size:0.78rem; font-weight:600; color:#92400e;
        margin-bottom:0.75rem;
      }
      .uc-login-success {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        padding:3rem 1rem; gap:0.75rem; text-align:center;
      }
      .uc-success-check {
        width:90px; height:90px; border-radius:50%;
        background:linear-gradient(135deg,#10B981,#059669);
        display:flex; align-items:center; justify-content:center;
        margin-bottom:0.5rem;
      }
      .uc-success-title { font-family:'Outfit',sans-serif; font-size:1.6rem; font-weight:900; color:#1e293b; }
      .uc-success-sub   { font-size:0.88rem; color:#64748b; font-weight:600; }

      /* ── Form ── */
      .uc-form { display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem; }
      .uc-field-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      @media(max-width:560px) { .uc-field-row { grid-template-columns:1fr; } }
      .uc-field { display:flex; flex-direction:column; gap:0.35rem; }
      .uc-label { font-size:0.75rem; font-weight:700; color:#475569; }
      .uc-input-wrap { position:relative; }
      .uc-field-icon {
        position:absolute; left:0.9rem; top:50%;
        transform:translateY(-50%);
        color:#94a3b8; pointer-events:none;
      }
      .uc-input {
        width:100%; box-sizing:border-box;
        background:#f1f5f9;
        border:1.5px solid transparent;
        border-radius:12px;
        padding:0.85rem 1rem 0.85rem 2.75rem;
        font-size:0.9rem;
        font-weight:600;
        font-family:'Plus Jakarta Sans',sans-serif;
        color:#1e293b;
        outline:none;
        transition:all 0.2s;
      }
      .uc-input:focus { border-color:#7C3AED; background:white; box-shadow:0 0 0 4px #7C3AED15; }
      .uc-textarea {
        width:100%; box-sizing:border-box;
        background:#f1f5f9;
        border:1.5px solid transparent;
        border-radius:12px;
        padding:0.85rem 1rem;
        font-size:0.9rem;
        font-weight:600;
        font-family:'Plus Jakarta Sans',sans-serif;
        color:#1e293b;
        outline:none;
        resize:vertical;
        transition:all 0.2s;
      }
      .uc-textarea:focus { border-color:#7C3AED; background:white; box-shadow:0 0 0 4px #7C3AED15; }

      .uc-photo-zone {
        border:2px dashed #e2e8f0;
        border-radius:14px;
        padding:1.5rem;
        cursor:pointer;
        text-align:center;
        display:flex; flex-direction:column; align-items:center; gap:0.5rem;
        transition:border-color 0.2s;
        background:#fafbfc;
      }
      .uc-photo-zone:hover { border-color:#7C3AED; }
      .uc-photo-text { font-size:0.82rem; font-weight:600; color:#475569; }
      .uc-photo-hint { font-size:0.7rem; color:#94a3b8; }
      .uc-photo-preview { position:relative; width:100%; }
      .uc-photo-preview img { width:100%; height:160px; object-fit:cover; border-radius:10px; }
      .uc-photo-change {
        display:flex; align-items:center; gap:0.35rem;
        margin-top:0.5rem; font-size:0.75rem; font-weight:700; color:#7C3AED; cursor:pointer;
        justify-content:center;
      }

      /* ── Confirm ── */
      .uc-confirm-layout {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:1.25rem;
        align-items:start;
      }
      @media(max-width:640px) { .uc-confirm-layout { grid-template-columns:1fr; } }
      .uc-summary-card { background:white; border:1px solid #e2e8f0; border-radius:18px; overflow:hidden; }
      .uc-summary-hero {
        display:flex; align-items:center; gap:1rem;
        padding:1.1rem;
      }
      .uc-summary-body { padding:1rem; display:flex; flex-direction:column; gap:0.5rem; }
      .uc-summary-row {
        display:flex; align-items:flex-start; gap:0.5rem;
        font-size:0.78rem; font-weight:600; color:#475569;
      }
      .uc-price-box { border-top:1px solid #f1f5f9; padding:1rem; }
      .uc-price-row { display:flex; justify-content:space-between; font-size:0.78rem; font-weight:600; color:#64748b; margin-bottom:0.4rem; }
      .uc-price-free {}
      .uc-price-total {
        display:flex; justify-content:space-between;
        font-size:1rem; font-weight:900; color:#1e293b;
        border-top:1px solid #e2e8f0; padding-top:0.5rem; margin-top:0.25rem;
      }
      .uc-confirm-includes { display:flex; flex-direction:column; gap:0.6rem; }
      .uc-includes-title { font-size:0.78rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.25rem; }
      .uc-includes-row { display:flex; align-items:flex-start; gap:0.4rem; font-size:0.8rem; color:#475569; font-weight:600; }
      .uc-guarantee-box {
        display:flex; align-items:flex-start; gap:0.75rem;
        background:#faf5ff; border:1px solid #DDD6FE;
        border-radius:12px; padding:0.85rem;
        margin:0.5rem 0;
      }
      .uc-agree {
        display:flex; align-items:flex-start; gap:0.5rem;
        font-size:0.75rem; color:#64748b; cursor:pointer; line-height:1.5;
      }
      .uc-error {
        display:flex; align-items:center; gap:0.4rem;
        background:#fef2f2; border:1px solid #fecaca;
        border-radius:10px; padding:0.6rem 0.85rem;
        font-size:0.78rem; color:#dc2626; font-weight:600;
        margin:0.5rem 0;
      }

      /* ── Success Page ── */
      .uc-success-page {
        max-width:520px;
        margin:3rem auto;
        text-align:center;
        padding:1rem;
        display:flex; flex-direction:column; align-items:center; gap:1rem;
      }
      .uc-success-circle {
        width:100px; height:100px; border-radius:50%;
        background:linear-gradient(135deg,#10B981,#059669);
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 16px 40px rgba(16,185,129,0.35);
      }
      .uc-success-h2 {
        font-family:'Outfit',sans-serif;
        font-size:1.75rem; font-weight:900; color:#1e293b; margin:0;
      }
      .uc-success-desc { font-size:0.88rem; color:#64748b; max-width:340px; }
      .uc-success-ref {
        background:white; border:1px solid #e2e8f0;
        border-radius:16px; padding:1.25rem 2rem;
        box-shadow:0 4px 16px rgba(0,0,0,0.06);
      }
      .uc-success-timeline {
        display:flex; flex-direction:column; gap:0; width:100%;
        background:white; border:1px solid #e2e8f0;
        border-radius:16px; overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,0.04);
      }
      .uc-tl-item {
        display:flex; align-items:center; gap:0.75rem;
        padding:0.75rem 1.25rem;
        border-bottom:1px solid #f8fafc;
        font-size:0.82rem; font-weight:600; color:#94a3b8;
      }
      .uc-tl-item:last-child { border-bottom:none; }
      .uc-tl-done { color:#1e293b; }
      .uc-tl-icon { font-size:1rem; width:24px; text-align:center; }
      .uc-tl-label { flex:1; }

      /* ── Buttons ── */
      .uc-btn-primary {
        display:inline-flex; align-items:center; justify-content:center; gap:0.45rem;
        background:linear-gradient(135deg,#7C3AED,#6d28d9);
        color:white; border:none; border-radius:14px;
        padding:0.85rem 1.75rem;
        font-size:0.9rem; font-weight:800;
        font-family:'Plus Jakarta Sans',sans-serif;
        cursor:pointer; transition:all 0.2s ease;
        box-shadow:0 4px 16px rgba(124,58,237,0.3);
        letter-spacing:-0.01em;
      }
      .uc-btn-primary:hover:not(:disabled) {
        transform:translateY(-2px);
        box-shadow:0 8px 28px rgba(124,58,237,0.4);
        filter:brightness(1.08);
      }
      .uc-btn-primary:active { transform:translateY(0); }
      .uc-btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; box-shadow:none; }
      .uc-btn-full { width:100%; }

      .uc-btn-outline {
        display:inline-flex; align-items:center; gap:0.4rem;
        background:white; color:#7C3AED;
        border:2px solid #7C3AED;
        border-radius:14px; padding:0.75rem 1.5rem;
        font-size:0.88rem; font-weight:700;
        font-family:inherit; cursor:pointer;
        transition:all 0.2s ease;
      }
      .uc-btn-outline:hover { background:#faf5ff; }

      .uc-link {
        background:none; border:none;
        color:#7C3AED; font-weight:700; font-size:inherit;
        font-family:inherit; cursor:pointer; text-decoration:underline;
        padding:0;
      }

      .uc-step-footer { padding-top:0.5rem; }

      /* ── Footer ── */
      .uc-footer {
        background:white; border-top:1px solid #e2e8f0;
        padding:0.75rem 1.5rem;
        display:flex; align-items:center; justify-content:center;
        gap:0.4rem; flex-wrap:wrap;
        font-size:0.72rem; font-weight:600; color:#94a3b8;
      }
      /* ── Package Modal ── */
      .uc-modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.4);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 1.5rem;
      }
      .uc-pkg-modal {
        background: white;
        border-radius: 24px;
        width: 100%; max-width: 960px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      }
      .uc-pkg-modal-close {
        position: absolute; top: 1rem; right: 1rem;
        background: rgba(255,255,255,0.9); border: none;
        width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; z-index: 10; color: #1e293b;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      .uc-pkg-modal-hero {
        position: relative; width: 100%; height: 200px;
        border-radius: 24px 24px 0 0; overflow: hidden;
      }
      .uc-pkg-modal-hero img {
        width: 100%; height: 100%; object-fit: cover;
      }
      .uc-pkg-modal-hero-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(to top, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.2) 100%);
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 2rem; color: white;
      }
      .uc-pkg-modal-hero-overlay h2 { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 800; margin: 0; }
      .uc-pkg-modal-hero-overlay p { margin: 0.2rem 0 0; color: rgba(255,255,255,0.85); font-weight: 500; font-size: 1rem; }
      .uc-pkg-modal-split {
        display: flex;
        flex-direction: row;
        background: #f8fafc;
        min-height: 400px;
      }
      .uc-pkg-sidebar {
        width: 300px;
        background: white;
        border-right: 1px solid #e2e8f0;
        padding: 2rem;
      }
      .uc-pkg-sidebar-title {
        font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0 0 1.2rem;
      }
      .uc-pkg-related-list {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column; gap: 0.75rem;
      }
      .uc-pkg-sidebar-card {
        display: flex; align-items: center; gap: 12px;
        font-size: 0.85rem; font-weight: 700; color: #475569;
        cursor: pointer; padding: 0.5rem; border-radius: 12px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }
      .uc-pkg-sidebar-img {
        width: 40px; height: 40px; border-radius: 8px; object-fit: cover;
      }
      .uc-pkg-sidebar-card:hover {
        background: white; border-color: #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);
      }
      .uc-pkg-sidebar-card.uc-pkg-sidebar-active {
        background: #ede9fe; color: #7C3AED; border-color: #ddd6fe; box-shadow: 0 4px 12px rgba(124,58,237,0.1);
      }
      
      .uc-pkg-filter-row {
        display: flex; gap: 0.5rem; margin-bottom: 1.5rem; overflow-x: auto; padding-bottom: 4px;
      }
      .uc-pkg-filter-pill {
        background: white; border: 1px solid #e2e8f0; color: #475569;
        padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.8rem; font-weight: 700;
        cursor: pointer; transition: all 0.2s; white-space: nowrap;
      }
      .uc-pkg-filter-pill:hover { background: #f8fafc; border-color: #cbd5e1; }
      .uc-pkg-filter-pill.active { background: #1e293b; color: white; border-color: #1e293b; }

      .uc-pkg-content {
        flex: 1;
        padding: 2rem;
      }
      .uc-pkg-content-title {
        font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0 0 1.5rem;
      }
      .uc-pkg-modal-list {
        display: flex; flex-direction: column; gap: 1rem;
      }
      .uc-pkg-modal-card-h {
        background: white; border-radius: 16px;
        padding: 1.5rem; position: relative;
        border: 1px solid #e2e8f0;
        cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        display: flex; flex-direction: row; align-items: center; justify-content: space-between;
        gap: 1.5rem;
      }
      .uc-pkg-modal-card-h:hover {
        transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.06); border-color: #7C3AED;
      }
      .uc-pkg-modal-card-left { flex: 1; }
      .uc-pkg-modal-tags { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
      .uc-pkg-badge {
        font-size: 0.7rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;
        color: white; text-transform: uppercase; letter-spacing: 0.05em;
      }
      .popular-badge { background: linear-gradient(135deg, #f59e0b, #d97706); }
      .value-badge { background: linear-gradient(135deg, #10b981, #059669); }
      
      .uc-pkg-modal-card-left h4 { margin: 0 0 0.4rem; font-size: 1.25rem; font-weight: 800; color: #1e293b; }
      .uc-pkg-modal-price-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
      .uc-pkg-modal-price { font-size: 1.4rem; font-weight: 900; color: #7C3AED; }
      .uc-pkg-modal-dur { font-size: 0.85rem; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px; }
      
      .uc-pkg-modal-inc-list { display: flex; flex-direction: column; gap: 0.4rem; }
      .uc-pkg-inc { font-size: 0.85rem; color: #475569; display: flex; align-items: flex-start; gap: 6px; line-height: 1.4; }
      .uc-pkg-inc svg { color: #10B981; flex-shrink: 0; margin-top: 2px; }
      
      .uc-pkg-modal-card-right { flex-shrink: 0; }
      .uc-btn-add { padding: 0.6rem 1.5rem; border-radius: 99px; }

      @media (max-width: 768px) {
        .uc-pkg-modal-split { flex-direction: column; }
        .uc-pkg-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e2e8f0; }
        .uc-pkg-modal-card-h { flex-direction: column; align-items: flex-start; }
        .uc-pkg-modal-card-right { width: 100%; }
        .uc-btn-add { width: 100%; }
      }
      
      .uc-pkg-modal-card-uc {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 1.5rem 0; border-bottom: 1px dashed #e2e8f0; gap: 1rem;
      }
      .uc-pkg-modal-card-uc:last-child { border-bottom: none; }
      
      .uc-uc-section-title {
        font-size: 1.5rem; font-weight: 900; color: #1e293b;
        margin-bottom: 1rem;
      }

      .uc-pkg-modal-card-uc-info { flex: 1; padding-right: 1rem; }
      .uc-pkg-uc-title { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-bottom: 0.2rem; }
      .uc-pkg-uc-rating { display: flex; align-items: center; font-size: 0.75rem; margin-bottom: 0.5rem; }
      .uc-pkg-uc-price { font-size: 0.85rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem; }
      .uc-pkg-uc-dot { margin: 0 4px; color: #94a3b8; }
      .uc-pkg-uc-includes { margin: 0; padding-left: 1.2rem; margin-bottom: 1rem; color: #475569; font-size: 0.85rem; line-height: 1.5; }
      .uc-pkg-uc-includes li { margin-bottom: 0.25rem; }
      .uc-pkg-uc-view-details { color: #7C3AED; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
      
      .uc-pkg-modal-card-uc-imgbox {
        position: relative; width: 120px; display: flex; flex-direction: column; align-items: center;
      }
      .uc-pkg-uc-img { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; }
      .uc-pkg-uc-add-wrap {
        position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 8px;
        background: white;
      }
      
      .uc-btn-add-swiggy {
        background: white; border: 1px solid #cbd5e1; color: #059669;
        font-weight: 800; padding: 0.4rem 1.4rem; border-radius: 999px;
        cursor: pointer; transition: all 0.2s; 
        text-transform: uppercase; font-size: 0.8rem;
        box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      }
      .uc-btn-add-swiggy:hover { background: #f0fdf4; border-color: #059669; }
      
      .uc-swiggy-qty {
        display: flex; align-items: center; justify-content: space-between;
        background: white; border: 1px solid #7C3AED; color: #7C3AED;
        font-weight: 800; border-radius: 8px; overflow: hidden; width: 90px;
      }
      .uc-swiggy-qty button {
        background: transparent; border: none; color: #7C3AED; padding: 0.4rem 0.8rem;
        cursor: pointer; font-weight: 800; transition: background 0.2s;
      }
      .uc-swiggy-qty button:hover { background: #f3e8ff; }
      
      .uc-pkg-modal-cart-bar {
        position: sticky; bottom: 0; left: 0; right: 0;
        background: white; border-top: 1px solid #e2e8f0;
        padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center;
        box-shadow: 0 -10px 30px rgba(0,0,0,0.05); z-index: 10;
        border-radius: 0 0 24px 24px;
      }
      .uc-cart-bar-left { display: flex; flex-direction: column; }
      .uc-cart-bar-items { font-size: 0.8rem; font-weight: 700; color: #64748b; }
      .uc-cart-bar-price { font-size: 1.25rem; font-weight: 900; color: #1e293b; }
      
      .uc-cart-bar-btn {
        background: #7C3AED; color: white; border: none;
        padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 800;
        cursor: pointer; display: flex; align-items: center; gap: 8px;
        transition: background 0.2s;
      }
      .uc-cart-bar-btn:hover { background: #6D28D9; }

    `}</style>
  )
}


const KITCHEN_SUB_TABS = [
  {
    id: "packages",
    name: "Full Kitchen Packages",
    image: "/mockups/kitchen_top_new.png",
  },
  {
    id: "appliance",
    name: "single appliance cleaning",
    image: "/mockups/appliance_cleaning_hero.png",
  },
  {
    id: "addons",
    name: "Quick Extra Services",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500&q=80&fit=crop",
  }
];

const FULL_KITCHEN_PACKAGES = [
  {
    id: "occ-basic",
    name: "Full Kitchen cleaning(Basic)",
    price: 1459,
    duration: "2 hrs",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80&fit=crop",
    includes: [
      "Kitchen tiles, floor & slab cleaning + Mopping",
      "Gas stove / hob cleaning",
      "Sink & under-sink cleaning",
      "Exhaust fan cleaning",
      "Windows & switchboards cleaning",
      "Cabinet exterior cleaning",
      "Dining table cleaning",
      "Utensil removal / rearrangement not included"
    ]
  },
  {
    id: "occ-deep",
    name: "Full Kitchen Cleaning – Deep Clean",
    price: 1959,
    duration: "3 hrs",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Includes everything in Basic, plus:",
      "Steam deep cleaning of stove / hob",
      "Cabinet interior & exterior cleaning",
      "Deep grease & stain removal",
      "Exhaust fan deep cleaning",
      "Utensil removal & rearrangement",
      "Hard-to-reach area cleaning"
    ]
  },
];

const APPLIANCE_SERVICES = [
  {
    id: "fridge-clean",
    name: "Refrigerator Cleaning",
    price: 799,
    duration: "1.5 hrs",
    image: "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&q=80&fit=crop",
    includes: [
      "Interior & exterior cleaning",
      "Shelves, trays & compartments cleaning",
      "Door seal & stain cleaning"
    ]
  },
  {
    id: "microwave-clean",
    name: "Microwave Oven Cleaning",
    price: 399,
    duration: "45 mins",
    image: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=300&q=80&fit=crop",
    includes: [
      "Interior & exterior cleaning",
      "Turntable & glass door cleaning",
      "Food stain & grease removal"
    ]
  },
  {
    id: "chimney-clean",
    name: "Chimney Cleaning",
    price: 999,
    duration: "1.5 hrs",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80&fit=crop",
    includes: [
      "Filter & exterior cleaning",
      "Grease & oil buildup removal",
      "Hood & accessible surface cleaning"
    ]
  },
  {
    id: "stove-clean",
    name: "Gas Stove / Hob Cleaning",
    price: 499,
    duration: "45 mins",
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&q=80&fit=crop",
    includes: [
      "Stove / hob surface cleaning",
      "Burner & knob cleaning",
      "Grease & food stain removal"
    ]
  },
  {
    id: "dishwasher-clean",
    name: "Dishwasher Cleaning",
    price: 599,
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=300&q=80&fit=crop",
    includes: [
      "Interior & exterior cleaning",
      "Filter, racks & tray cleaning",
      "Food residue & buildup removal"
    ]
  },
  {
    id: "fan-clean",
    name: "Ceiling Fan Cleaning",
    price: 199,
    duration: "30 mins",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&q=80&fit=crop",
    includes: [
      "Fan blade cleaning",
      "Motor housing & cover dusting",
      "Dust & surface grime removal"
    ]
  },
  {
    id: "exhaust-fan-clean",
    name: "Exhaust Fan Cleaning",
    price: 299,
    duration: "30 mins",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Exhaust fan blades cleaning",
      "Fan cover / grill cleaning",
      "Dust and grease removal"
    ]
  }
];

const QUICK_EXTRA_SERVICES = [
  {
    id: "sink-vessel-mopping-clean",
    name: "Sink & Under-Sink + Vessel Cleaning + Kitchen Slab + Mopping",
    price: 399,
    duration: "1 hr",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Sink & under-sink washing",
      "Vessel cleaning included",
      "Kitchen slab and floor mopping"
    ]
  },
  {
    id: "dining-table-quick",
    name: "Dining Table Cleaning",
    price: 199,
    duration: "30 mins",
    image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=300&q=80&fit=crop",
    includes: [
      "Table surface cleaning",
      "Normal food stain removal",
      "Dirt and grime wiping"
    ]
  },
  {
    id: "kitchen-window-quick",
    name: "Kitchen Window Cleaning",
    price: 299,
    duration: "30 mins",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80&fit=crop",
    includes: [
      "Accessible glass surface cleaning",
      "Window frame & sill wiping",
      "Dust and dirt removal"
    ]
  }
];

const SERVICE_DETAIL_DATA = {
  "occ-basic": {
    tools: [
      "Kitchen-safe degreasers",
      "Microfiber cloths",
      "Non-abrasive scrubbers",
      "Detail cleaning brushes",
      "Floor and surface cleaning tools"
    ],
    ready: [
      "Continuous water supply",
      "Working power connection",
      "Kitchen area accessible for cleaning",
      "Fragile items and valuables kept safely"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The kitchen was cleaned very neatly. The stove, sink and tiles looked fresh after the service."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service for regular kitchen cleaning. The team was quick and professional."' }
    ],
    faqs: [
      { q: "Will you move utensils from the cabinets?", a: "No. Utensil removal and rearrangement are not included in the Basic package." },
      { q: "Do I need to provide cleaning products?", a: "No. Our professionals bring the required cleaning tools and products." },
      { q: "Is chimney cleaning included?", a: "No. Chimney cleaning can be booked separately under Single Appliance & Specific Area Cleaning." },
      { q: "Can I add appliance cleaning?", a: "Yes. You can add individual appliance cleaning as an additional service." },
      { q: "How long does the service take?", a: "The Basic package takes approximately 2 hours, depending on the kitchen size and condition." }
    ]
  },
  "occ-deep": {
    tools: [
      "Steam cleaning equipment",
      "Kitchen-safe degreasers",
      "Microfiber cloths",
      "Non-abrasive scrubbers",
      "Detail brushes for corners and cabinets"
    ],
    ready: [
      "Continuous water supply",
      "Working power connection",
      "Kitchen area accessible for cleaning",
      "Fragile items and valuables kept safely"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"Excellent deep cleaning. The grease on the stove and tiles was removed, and the cabinets were cleaned properly."' },
      { name: "Karthik M.", rating: "4.9", text: '"Very thorough service. They cleaned areas that are usually difficult to reach."' }
    ],
    faqs: [
      { q: "Does Deep Clean include everything in Basic?", a: "Yes. Deep Clean includes all services covered in the Basic package, along with additional deep-cleaning services." },
      { q: "Will you remove and rearrange utensils?", a: "Yes. Utensils can be removed and rearranged as part of the Deep Clean service." },
      { q: "Does Deep Clean include chimney cleaning?", a: "No. Chimney cleaning is available separately under Single Appliance & Specific Area Cleaning." },
      { q: "Can I add refrigerator or microwave cleaning?", a: "Yes. Individual appliance cleaning can be added separately to your booking." },
      { q: "Does steam cleaning remove tough grease?", a: "Yes. Steam cleaning helps loosen and remove stubborn grease, oil buildup and stains from suitable kitchen surfaces." },
      { q: "How long does the service take?", a: "The Deep Clean package takes approximately 3 hours, depending on the kitchen size and condition." }
    ]
  },
  "fridge-clean": {
    tools: [
      "Food-safe cleaning products",
      "Microfiber cloths",
      "Soft scrubbers",
      "Small cleaning brushes"
    ],
    ready: [
      "Remove food items before cleaning",
      "Keep the refrigerator accessible",
      "Keep a power connection available"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very neat cleaning. The shelves and inside of the fridge look fresh now."' },
      { name: "Rahul K.", rating: "4.8", text: '"Good service and the team handled everything carefully."' }
    ],
    faqs: [
      { q: "Do I need to remove the food?", a: "Yes, please remove all food items before cleaning." },
      { q: "Will you clean the freezer?", a: "Yes, accessible freezer areas will be cleaned." },
      { q: "Will you remove bad smell?", a: "We clean food stains and dirt that may cause unpleasant smells." }
    ]
  },
  "microwave-clean": {
    tools: [
      "Appliance-safe cleaning products",
      "Microfiber cloths",
      "Soft scrubbers",
      "Small cleaning brushes"
    ],
    ready: [
      "Remove food and containers",
      "Keep the microwave accessible",
      "Ensure the appliance is switched off"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The inside of my microwave was cleaned really well."' },
      { name: "Karthik M.", rating: "4.9", text: '"Quick and neat service. The food stains were removed properly."' }
    ],
    faqs: [
      { q: "Will you clean the inside of the microwave?", a: "Yes, the inside, glass door and rotating plate will be cleaned." },
      { q: "Do I need to remove everything before cleaning?", a: "Yes, please remove food and containers before the service." },
      { q: "Can you remove burnt food stains?", a: "We will clean removable food and grease stains." }
    ]
  },
  "chimney-clean": {
    tools: [
      "Grease-removing cleaning products",
      "Microfiber cloths",
      "Soft scrubbers",
      "Cleaning brushes"
    ],
    ready: [
      "Keep the chimney area accessible",
      "Clear items around the stove",
      "Ensure a power connection is available"
    ],
    reviews: [
      { name: "Karthik M.", rating: "5.0", text: '"The grease on my chimney filter was cleaned properly."' },
      { name: "Ananya S.", rating: "4.8", text: '"Good cleaning service. The chimney looks much cleaner now."' }
    ],
    faqs: [
      { q: "Will you clean the chimney filter?", a: "Yes, the chimney filter will be cleaned." },
      { q: "Will you remove grease and oil?", a: "Yes, visible grease and oil buildup will be cleaned." },
      { q: "Do you repair the chimney?", a: "No, repair and replacement work are not included." }
    ]
  },
  "stove-clean": {
    tools: [
      "Stove-safe cleaning products",
      "Microfiber cloths",
      "Soft scrubbers",
      "Small cleaning brushes"
    ],
    ready: [
      "Switch off the stove before cleaning",
      "Remove vessels and cookware",
      "Keep the stove area accessible"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The stove looks much cleaner and the grease was removed nicely."' },
      { name: "Rahul K.", rating: "4.9", text: '"Very good cleaning and the team was careful with the hob."' }
    ],
    faqs: [
      { q: "Will you clean the burners?", a: "Yes, the accessible burner areas will be cleaned." },
      { q: "Will you remove grease?", a: "Yes, oil, grease and food stains will be cleaned." },
      { q: "Do you repair gas stoves or hobs?", a: "No, repair work is not included." }
    ]
  },
  "dishwasher-clean": {
    tools: [
      "Dishwasher-safe cleaning products",
      "Microfiber cloths",
      "Soft scrubbers",
      "Small cleaning brushes"
    ],
    ready: [
      "Remove all dishes before cleaning",
      "Keep the dishwasher accessible",
      "Keep water and power connections available"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The dishwasher was cleaned very neatly, especially the racks and filter."' },
      { name: "Karthik M.", rating: "4.8", text: '"Good service and the inside looks much cleaner now."' }
    ],
    faqs: [
      { q: "Will you clean the filter?", a: "Yes, the accessible filter will be cleaned." },
      { q: "Do I need to remove the dishes?", a: "Yes, please empty the dishwasher before cleaning." },
      { q: "Will you remove food waste and dirt?", a: "Yes, visible food waste and dirt will be cleaned." }
    ]
  },
  "fan-clean": {
    tools: [
      "Microfiber dusting cloths",
      "Long-reach dusting tools",
      "Soft cleaning brushes",
      "Surface-safe cleaning products"
    ],
    ready: [
      "Clear the area below the fan",
      "Keep furniture or fragile items safely away",
      "Ensure safe access to the fan"
    ],
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The fan had a lot of dust and was cleaned very neatly."' },
      { name: "Rahul K.", rating: "4.9", text: '"Quick service and no dust was left around the room."' }
    ],
    faqs: [
      { q: "Will you clean the fan blades?", a: "Yes, all accessible fan blades will be cleaned." },
      { q: "Do you remove the fan from the ceiling?", a: "No, the fan is cleaned while it is installed." },
      { q: "Will you clean a very dusty fan?", a: "Yes, normal dust and visible dirt will be removed." }
    ]
  },
  "exhaust-fan-clean": {
    tools: [
      "Microfiber cloths",
      "Soft cleaning brushes",
      "Grease-removing cleaning solution",
      "Long-reach dusting tools"
    ],
    ready: [
      "Switch off the exhaust fan before cleaning",
      "Keep the area around the fan clear",
      "Provide safe access to the fan"
    ],
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"The exhaust fan had a lot of dust and grease. It was cleaned very neatly."' },
      { name: "Rahul K.", rating: "4.8", text: '"Quick service and the fan looks much cleaner now."' }
    ],
    faqs: [
      { q: "Will you clean the fan blades?", a: "Yes, the accessible fan blades will be cleaned properly." },
      { q: "Will you clean the cover / grill?", a: "Yes, the fan cover and visible grill will also be cleaned." },
      { q: "Will you remove grease from the fan?", a: "Yes, normal dust, grease and dirt buildup will be cleaned." },
      { q: "Will you remove the exhaust fan from the wall?", a: "No, the fan will be cleaned while it remains installed." },
      { q: "Do you repair exhaust fans?", a: "No, electrical, motor and wiring repairs are not included." }
    ]
  },
  "sink-vessel-mopping-clean": {
    reviews: [
      { name: "Ananya S.", rating: "5.0", text: '"Very useful service for a quick kitchen cleanup. The sink and slab were cleaned nicely."' },
      { name: "Priya R.", rating: "4.8", text: '"The vessels, sink and kitchen floor were cleaned properly. Good service."' }
    ],
    faqs: [
      { q: "Will you wash the vessels?", a: "Yes, the vessels provided for cleaning will be washed as part of the service." },
      { q: "Will you clean under the sink?", a: "Yes, the accessible area under the sink will be cleaned." },
      { q: "Will you clean the kitchen floor?", a: "Yes, the kitchen floor will be mopped." },
      { q: "Will you remove heavy grease from the slab?", a: "Light grease and food stains are included. Heavy buildup may require deep cleaning." }
    ]
  },
  "dining-table-quick": {
    reviews: [
      { name: "Rahul K.", rating: "5.0", text: '"The dining table was cleaned very neatly. Food stains were removed well."' },
      { name: "Ananya S.", rating: "4.9", text: '"Quick and simple service. The table looks fresh and clean."' }
    ],
    faqs: [
      { q: "Will you clean the chairs too?", a: "No, chair cleaning is not included in this service." },
      { q: "Will you remove food stains?", a: "Yes, normal food stains and dirt will be cleaned." },
      { q: "Do I need to clear the table before cleaning?", a: "Yes, please remove food, utensils and personal items before the service." }
    ]
  },
  "kitchen-window-quick": {
    reviews: [
      { name: "Priya R.", rating: "5.0", text: '"The kitchen window was dusty and greasy, and it looks much cleaner now."' },
      { name: "Karthik M.", rating: "4.8", text: '"Good cleaning and the glass was left without visible marks."' }
    ],
    faqs: [
      { q: "Will you clean the window glass?", a: "Yes, the accessible glass surface will be cleaned." },
      { q: "Will you clean the window frame?", a: "Yes, the accessible frame and sill will also be cleaned." },
      { q: "Will you clean the outside of the window?", a: "Only safely accessible exterior areas will be cleaned." },
      { q: "Will you remove paint or cement stains?", a: "No. Heavy paint, cement or permanent stains may require specialized cleaning." }
    ]
  }
};

export function KitchenCleaningModal({ category, cart, setCart, onClose, onCheckout }) {
  const [activeTab, setActiveTab] = useState("packages");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedServiceDetails, setSelectedServiceDetails] = useState(null);
  const [isBasicExpanded, setIsBasicExpanded] = useState(false);
  const [isDeepExpanded, setIsDeepExpanded] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const addItemToCart = (id, name, price, duration) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id, name, price, duration, quantity: 1 }];
    });
  };

  const removeItemFromCart = (id) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === id);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const getCount = (id) => cart.find(i => i.id === id)?.quantity || 0;

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const getActiveServices = () => {
    let list = [];
    if (activeTab === "packages") list = FULL_KITCHEN_PACKAGES;
    else if (activeTab === "appliance") list = APPLIANCE_SERVICES;
    else if (activeTab === "addons") list = QUICK_EXTRA_SERVICES;

    if (!searchQuery) return list;
    return list.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const activeServices = getActiveServices();

  return (
    <div className="w-full text-slate-700 bg-white">
      {/* Sticky Header + Tabs */}
      <div className="sticky top-16 z-20 bg-white pb-2 shadow-sm">
        <div className="p-0 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white py-4">
          <div>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-slate-500 hover:text-emerald-700 font-semibold mb-2 text-xs transition-colors"
            >
              <ChevronLeft size={16} /> Back to Services
            </button>
            <h2 className="text-xl font-black text-slate-900">Kitchen Cleaning</h2>
          </div>
        </div>
        <div className="flex gap-5 pb-3 pt-2 border-b border-slate-100 justify-start">
          {KITCHEN_SUB_TABS.map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
                className="flex flex-col items-center justify-start p-1.5 transition-all cursor-pointer text-center bg-transparent w-[90px] shrink-0"
              >
                <img
                  src={tab.image}
                  alt={tab.name}
                  className={`w-14 h-14 object-cover rounded-xl mb-1.5 transition-all duration-200 ${isSelected ? "scale-[1.05] shadow-md" : "opacity-80 hover:opacity-100"
                    }`}
                />
                <span className={`text-[10px] block leading-tight tracking-tight mt-0.5 transition-colors ${isSelected ? "text-slate-800 font-extrabold" : "text-slate-600 font-bold"
                  }`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 pt-4">

        {/* Left Column */}
        <div className="flex-1 space-y-5 lg:pr-6">

          {/* Section title */}
          <div className="pt-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <div className="w-1.5 h-3.5 bg-emerald-600 rounded-full" />
              {activeTab === "packages" ? "Full Kitchen Packages" : activeTab === "appliance" ? "Single Appliance & Specific Area Cleaning" : "Quick Extra Services"}
            </h3>
          </div>

          <div className="space-y-0 divide-y divide-slate-100">
            {activeServices.map((service, idx) => {
              const count = getCount(service.id);
              const isFirst = idx === 0 && !searchQuery;
              return (
                <div key={service.id} className="py-5 px-4 sm:px-5">
                  {/* First item image hero */}
                  {isFirst && (
                    <div className="w-full aspect-[10/3] bg-slate-100 rounded-2xl overflow-hidden mb-4">
                      <img
                        src={activeTab === "packages" ? "/mockups/kitchen_top_new.png" : activeTab === "appliance" ? "/mockups/appliance_cleaning_hero.png" : service.image}
                        alt={service.name}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-slate-900 mb-1">{service.name}</h4>

                      <p className="text-xs font-bold text-slate-800">
                        {service.options ? `Starts at ₹${service.price}` : `₹${service.price}`}
                        <span className="text-slate-400 font-normal ml-2">• {service.duration}</span>
                      </p>
                      {activeTab !== "addons" && (
                        <div className="mt-3 space-y-1">
                          {(() => {
                            const isBasic = service.id === "occ-basic";
                            const isDeep = service.id === "occ-deep";
                            const isExpanded = isBasic ? isBasicExpanded : (isDeep ? isDeepExpanded : true);
                            const displayIncludes = (isBasic || isDeep) && !isExpanded 
                              ? service.includes.slice(0, 3) 
                              : service.includes;
                            
                            return (
                              <>
                                {displayIncludes.map((item, i) => {
                                  const isLastOfThree = (isBasic || isDeep) && !isExpanded && i === 2;
                                  return (
                                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                      <span className="text-slate-400 mt-0.5">•</span>
                                      <span>
                                        {item}
                                        {isLastOfThree && (
                                          <>
                                            {" "}
                                            <span 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (isBasic) setIsBasicExpanded(true);
                                                if (isDeep) setIsDeepExpanded(true);
                                              }}
                                              className="text-emerald-600 font-extrabold cursor-pointer hover:underline ml-1"
                                            >
                                              read more
                                            </span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                  );
                                })}
                                {(isBasic || isDeep) && isExpanded && (
                                  <div className="text-left mt-1 pl-3">
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isBasic) setIsBasicExpanded(false);
                                        if (isDeep) setIsDeepExpanded(false);
                                      }}
                                      className="text-emerald-600 font-extrabold cursor-pointer hover:underline text-xs block"
                                    >
                                      read less
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedServiceDetails(service)}
                        className="text-xs font-semibold text-blue-600 mt-2 hover:underline"
                      >
                        View details
                      </button>
                      {service.options && (
                        <p className="text-[11px] text-slate-400 mt-1">{service.options}</p>
                      )}
                    </div>

                    {/* Image + add button */}
                    <div className="relative shrink-0 w-28 pb-3 flex flex-col items-center">
                      <div className="w-28 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 flex items-center justify-center">
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 z-10">
                        {count > 0 ? (
                          <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 shadow-md">
                            <button onClick={() => removeItemFromCart(service.id)} className="hover:text-emerald-900">-</button>
                            <span>{count}</span>
                            <button onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)} className="hover:text-emerald-900">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItemToCart(service.id, service.name, service.price, service.duration)}
                            className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-[11px] py-1.5 rounded-lg hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-1 uppercase"
                          >
                            <ShoppingCart size={12} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="w-full lg:w-[350px] bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100 p-5 flex flex-col justify-between lg:sticky lg:top-32 h-fit space-y-4 mt-6 lg:mt-0 rounded-2xl">
          <div className="space-y-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">Order Summary</h5>
                <span className="text-[10px] font-bold text-slate-400">{cart.length} items</span>
              </div>

              {cart.length > 0 ? (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start text-xs gap-2">
                      <div className="flex-1">
                        <span className="font-bold text-slate-800 block leading-tight">{item.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{item.duration}</span>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold">
                          <button onClick={() => removeItemFromCart(item.id)} className="hover:text-emerald-600">-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => addItemToCart(item.id, item.name, item.price, item.duration)} className="hover:text-emerald-600">+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No services added. Select from the left.
                </div>
              )}

              <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs">
                {cart.length > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-slate-900 text-sm border-t border-dashed border-slate-200 pt-2">
                  <span>Total Amount</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-200/60">
            <button
              disabled={cart.length === 0}
              onClick={onCheckout}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl text-center text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              Proceed to Schedule
            </button>
          </div>
        </div>
      </div>

      {selectedServiceDetails && (
        <div className="fixed inset-0 z-[250] bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative font-sans">
            {/* Close button */}
            <button
              onClick={() => setSelectedServiceDetails(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white p-1.5 rounded-full z-30 shadow-md transition-colors"
            >
              <X size={16} />
            </button>

            {/* Header: split hero image + promo card */}
            <div className="flex h-36 border-b border-slate-100 shrink-0">
              <div className="w-[60%] h-full bg-slate-100">
                <img
                  src={selectedServiceDetails.image}
                  alt={selectedServiceDetails.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-[40%] bg-amber-50/70 p-4 flex flex-col justify-center text-left border-l border-amber-100/50">
                <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider mb-0.5">FLAT 10% OFF</span>
                <span className="text-[10px] text-slate-600 font-bold leading-tight mb-2">For New Users</span>
                <span className="text-[9px] font-bold text-slate-500 bg-white border border-amber-200 rounded px-1.5 py-0.5 w-fit uppercase tracking-tight">CODE: NEWCLEAN10</span>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Title, rating and add wrap */}
              <div className="border-b border-slate-100 pb-5">
                <h3 className="text-base font-extrabold text-slate-900 mb-1">{selectedServiceDetails.name}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-4">
                  <Star className="text-[#7C3AED] fill-[#7C3AED]" size={12} />
                  <span className="text-slate-800">4.82</span>
                  <span className="text-slate-400 font-normal underline">(4.5M reviews)</span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100/80 rounded-2xl p-4">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      ₹{selectedServiceDetails.price}
                      <span className="text-slate-400 text-xs font-normal ml-2">• {selectedServiceDetails.duration}</span>
                    </div>
                  </div>

                  {/* Add button inside details modal */}
                  <div className="w-24">
                    {getCount(selectedServiceDetails.id) > 0 ? (
                      <div className="flex items-center justify-between bg-white border border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-bold text-emerald-700 shadow-md">
                        <button onClick={() => removeItemFromCart(selectedServiceDetails.id)} className="hover:text-emerald-900">-</button>
                        <span>{getCount(selectedServiceDetails.id)}</span>
                        <button onClick={() => addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration)} className="hover:text-emerald-900">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration)}
                        className="w-full bg-white border border-slate-200 text-emerald-600 font-extrabold text-xs py-2 rounded-lg hover:bg-slate-50 transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-1"
                      >
                        <ShoppingCart size={13} /> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tools & Products We Use */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SERVICE_DETAIL_DATA[id] || {};
                const tools = detail.tools || [];
                if (tools.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Tools & Products We Use</h4>
                    <div className="space-y-2">
                      {tools.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* What You Need to Keep Ready */}
              {(() => {
                const id = selectedServiceDetails.id;
                const detail = SERVICE_DETAIL_DATA[id] || {};
                const readyList = detail.ready || [];
                if (readyList.length === 0) return null;
                return (
                  <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">What You Need to Keep Ready</h4>
                    <div className="space-y-2">
                      {readyList.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Customer Reviews */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Customer Reviews</h4>
                {(() => {
                  const id = selectedServiceDetails.id;
                  const detail = SERVICE_DETAIL_DATA[id] || {};
                  const reviews = detail.reviews || [];
                  return reviews.map((rev, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5 mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{rev.name}</span>
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#7C3AED]">
                          <Star className="fill-[#7C3AED] text-[#7C3AED]" size={12} />
                          <span>{rev.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        {rev.text}
                      </p>
                    </div>
                  ));
                })()}
              </div>

              {/* Frequently Asked Questions */}
              <div className="space-y-2.5 border-t border-slate-100 pt-5 text-left">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Frequently Asked Questions</h4>
                <div className="space-y-2">
                  {(() => {
                    const id = selectedServiceDetails.id;
                    const detail = SERVICE_DETAIL_DATA[id] || {};
                    const faqs = detail.faqs || [];
                    return faqs.map((faq, idx) => {
                      const isFaqOpen = activeFaq === idx;
                      return (
                        <div key={idx} className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
                          <button
                            onClick={() => setActiveFaq(isFaqOpen ? null : idx)}
                            className="w-full p-3 flex justify-between items-center text-xs bg-white font-semibold text-left cursor-pointer hover:bg-slate-50/50"
                          >
                            <span className={isFaqOpen ? "text-emerald-600 font-bold" : "text-slate-700"}>{faq.q}</span>
                            <span className={isFaqOpen ? "text-emerald-600 text-sm font-bold ml-2 shrink-0" : "text-slate-400 text-sm font-bold ml-2 shrink-0"}>{isFaqOpen ? "−" : "+"}</span>
                          </button>
                          {isFaqOpen && (
                            <div className="px-3 pb-3 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-50 bg-slate-50/20">
                              {faq.a}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Sticky Footer with teal proceed button */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Occupied Kitchen Clean</div>
              <button
                onClick={() => {
                  if (getCount(selectedServiceDetails.id) === 0) {
                    addItemToCart(selectedServiceDetails.id, selectedServiceDetails.name, selectedServiceDetails.price, selectedServiceDetails.duration);
                  }
                  setSelectedServiceDetails(null);
                }}
                className="bg-[#54B6A6] hover:bg-[#43a192] text-white font-extrabold text-xs py-2.5 px-6 rounded-lg shadow-md transition-all uppercase tracking-wider"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export function PackageModal({ category, cart, setCart, onClose, onCheckout, packagesData }) {
  return (
    <CustomCleaningPackageModal
      category={category}
      cart={cart}
      setCart={setCart}
      onClose={onClose}
      onCheckout={onCheckout}
    />
  );
}
