# Tremorpulse

Tremorpulse is a lightweight, static earthquake tracking website that shows
recent earthquake activity in near real time.

It combines a clean frontend with a small Cloudflare Pages Function proxy so
live data can be fetched reliably from the USGS public earthquake feed.

## What Tremorpulse Includes

- Live earthquake list and map view on the homepage
- Auto-refreshing quake data from a serverless endpoint
- Responsive, no-framework frontend (HTML, CSS, and vanilla JavaScript)
- Basic SEO and site metadata pages (About, FAQ, Privacy Policy, Terms, Contact)

## Data Source

Tremorpulse uses the USGS earthquake feed:

https://earthquake.usgs.gov/earthquakes/feed/

## Tech Stack

- Static site files for UI and content
- Cloudflare Pages Functions for the API proxy layer
- No frontend framework and no build pipeline required

## Project Structure

- `index.html` for the main dashboard
- `js/app.js` for live data fetching and rendering
- `functions/api/quakes.js` for the serverless API proxy
- `css/style.css` for styling

## Purpose

This repository is intended as a clean starting point for a public earthquake
monitoring site under the Tremorpulse brand.
