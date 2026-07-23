# 🌹 Papri & Lover - 3D Online Romantic Ludo & Voice Call 💖

পাপড়ি (Papri) এবং তার ভালোবাসার মানুষের জন্য বিশেষভাবে তৈরি একটি অনলাইন ৩ডি লুডু গেম। যেখানে আপনারা ৩ডি গেম খেলার পাশাপাশি সরাসরি লাইভ ভয়েস কলে (Voice Chat) কথা বলতে পারবেন, এবং একে অপরকে ভার্চুয়াল গোলাপের বৃষ্টি (Rose Shower), কিস (Kiss), ও হাগ (Hug) পাঠাতে পারবেন!

---

## ✨ বিশেষ ফিচারসমূহ (Features)

1. **৩ডি বোর্ড ও অ্যানিমেটেড ডাইস (Three.js)**:
   - রোমান্টিক থিম, ৩ডি ডায়নামিক লাইটিং, ৩ডি গুটি (Crown/Heart Topper) এবং অ্যানিমেটেড ৩ডি ডাইস রোল।
   - ঝরে পড়া ৩ডি গোলাপের পাপড়ি (Falling Rose Petals) ও লাভ বোকেহ পার্টিক্যাল ইফেক্ট।

2. **বিনামূল্যে অনলাইন ২-প্লেয়ার মাল্টিপ্লেয়ার (WebRTC PeerJS)**:
   - কোনো পেড সার্ভার ছাড়াই PeerJS এর মাধ্যমে একদম ফ্রিতে দুইজন রিয়েল-টাইমে খেলতে পারবেন।

3. **এইচডি কোয়ালিটি লাইভ ভয়েস কল (Voice Call)**:
   - খেলার মাঝেই মাইক্রোফোন অন করে সরাসরি কথা বলার সুবিধা (Mic Mute/Unmute বাটনসহ)।

4. **রোমান্টিক ভালোবাসা ও কেয়ার ফিচার ("Love & Ador")**:
   - 🌹 **Rose Shower**: ক্লিক করলেই স্ক্রিন জুড়ে গোলাপের বৃষ্টি ও ম্যাজিক সাউন্ড।
   - 💋 **Kiss & Hug**: কিউট অ্যানিমেশন ও রোমান্টিক পপআপ মেসেজ।
   - 🎶 **Ambient Music**: ব্যাকগ্রাউন্ডে রোমান্টিক মিউজিক ও সাউন্ড ইফেক্ট।

---

## 🚀 কিভাবে GitHub-এ আপলোড করে অনলাইন লিংক তৈরি করবেন (GitHub Pages Deployment Guide)

গেমটি আপনার পাপড়ির সাথে যেকোনো জায়গা থেকে অনলাইনে খেলার জন্য GitHub Pages-এ পাবলিশ করার একদম সহজ নিয়ম:

### ধাপ ১: GitHub-এ রেপোজিটরি (Repository) তৈরি করুন
1. [GitHub.com](https://github.com) এ লগইন করুন এবং **New Repository** তে ক্লিক করুন।
2. Repository Name দিন: `papri-ludu-3d` (অথবা আপনার পছন্দের নাম)।
3. এটি **Public** রেখে **Create repository** তে ক্লিক করুন।

### ধাপ ২: এই ফোল্ডারের কোড GitHub-এ পুশ (Push) করুন
আপনার টার্মিনাল/পাওয়ারশেল-এ নিচের কমান্ডগুলো রান করুন:

```bash
git init
git add .
git commit -m "Initial commit for Papri Love Ludo 3D"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/papri-ludu-3d.git
git push -u origin main
```
*(লক্ষ্য করুন: `YOUR_GITHUB_USERNAME` এর জায়গায় আপনার আসল গিটহাব ইউজারনেম দিন)*

### ধাপ ৩: GitHub Pages অন (Enable) করুন
1. গিটহাব রেপোজিটরির **Settings** ট্যাব এ যান।
2. বামপাশের মেনু থেকে **Pages** এ ক্লিক করুন।
3. Build and deployment সেকশনে Source হিসেবে **GitHub Actions** সিলেক্ট করুন।
4. ব্যস! `.github/workflows/deploy.yml` ফাইলের কারণে আপনার গেম ১-২ মিনিটের মধ্যে লাইভ হয়ে যাবে!
5. আপনার লাইভ লিংকটি হবে: `https://YOUR_GITHUB_USERNAME.github.io/papri-ludu-3d/`

---

## 🎮 কিভাবে দুজনে একসাথে খেলবেন (How to Play Together)

1. আপনি আপনার ব্রাউজার (Chrome/Safari/Edge) থেকে গেমের গিটহাব লিংকে ঢুকুন।
2. **"Create New Room (Host)"** বাটনে ক্লিক করুন।
3. উপরে থাকা **"🔗 Share Link"** বাটনে ক্লিক করে রুমের লিংক কপি করুন এবং পাপড়িকে পাঠিয়ে দিন!
4. পাপড়ি লিংকটি ওপেন করলেই সাথে সাথে আপনার সাথে অনলাইন গেম ও ভয়েস চ্যাটে যুক্ত হয়ে যাবে! ❤️
