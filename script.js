// ISS Tracker JavaScript
class ISSTracker {
    constructor() {
        this.map = null;
        this.issMarker = null;
        this.orbitPath = [];
        this.orbitPolyline = null;
        this.directionMarker = null;
        this.showOrbit = false;
        this.showNightLayer = false;
        this.nightLayer = null;
        this.altitudeData = [];
        this.altitudeChart = null;
        this.updateInterval = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Initializing ISS Tracker...');
            this.initMap();
            this.initEventListeners();
            this.initChart();
            console.log('✅ Basic initialization complete');
            
            await this.loadInitialData();
            console.log('✅ Initial data loaded');
            
            this.startTracking();
            console.log('✅ Tracking started');
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError('Failed to initialize ISS Tracker: ' + error.message);
        }
    }

    initMap() {
        // Initialize Leaflet map
        this.map = L.map('map').setView([0, 0], 2);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Custom ISS icon
        const issIcon = L.divIcon({
            html: '<i class="fas fa-satellite iss-marker" style="color: #f59e0b; font-size: 24px;"></i>',
            iconSize: [30, 30],
            className: 'custom-div-icon'
        });

        // Initialize ISS marker
        this.issMarker = L.marker([0, 0], { icon: issIcon }).addTo(this.map);
    }

    initEventListeners() {
        // Navigation
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        hamburger?.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }

                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Close mobile menu
                navMenu.classList.remove('active');
            });
        });

        // Map controls
        document.getElementById('center-iss')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.centerMapOnISS();
        });

        document.getElementById('toggle-orbit')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleOrbitPath();
        });

        document.getElementById('toggle-night')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleNightLayer();
        });

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.info-card, .astronaut-card, .stat-card').forEach(el => {
            observer.observe(el);
        });
    }

    initChart() {
        const ctx = document.getElementById('altitude-chart');
        if (!ctx) return;

        this.altitudeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Altitude (km)',
                    data: [],
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 400,
                        max: 420,
                        grid: {
                            color: '#334155'
                        },
                        ticks: {
                            color: '#cbd5e1'
                        }
                    },
                    x: {
                        grid: {
                            color: '#334155'
                        },
                        ticks: {
                            color: '#cbd5e1'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#cbd5e1'
                        }
                    }
                }
            }
        });
    }

    async loadInitialData() {
        try {
            console.log('📡 Loading initial ISS data...');
            await Promise.all([
                this.updateISSPosition(),
                this.updateAstronauts()
            ]);
            console.log('✅ Initial data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            // Don't fail completely, just show error and continue
            this.showError('Some data failed to load. Retrying...');
            // Retry after 2 seconds
            setTimeout(() => {
                this.loadInitialData();
            }, 2000);
        }
    }

    startTracking() {
        // Update ISS position every 5 seconds
        this.updateInterval = setInterval(() => {
            this.updateISSPosition();
        }, 5000);

        // Update astronauts every 30 seconds
        setInterval(() => {
            this.updateAstronauts();
        }, 30000);

        // Update statistics every minute
        setInterval(() => {
            this.updateStatistics();
        }, 60000);
    }

    async updateISSPosition() {
        try {
            console.log('📍 Fetching ISS position...');
            
            // Primary API with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📡 ISS data received:', data);

            if (data.latitude !== undefined && data.longitude !== undefined) {
                const lat = parseFloat(data.latitude);
                const lng = parseFloat(data.longitude);

                // Update marker position
                this.issMarker.setLatLng([lat, lng]);
                
                // Update position display
                document.getElementById('current-lat').textContent = `${lat.toFixed(4)}°`;
                document.getElementById('current-lng').textContent = `${lng.toFixed(4)}°`;

                // Add to orbit path
                this.orbitPath.push([lat, lng]);
                if (this.orbitPath.length > 100) {
                    this.orbitPath.shift(); // Keep only last 100 points
                }

                // Update orbit path if enabled
                if (this.showOrbit) {
                    this.updateOrbitPath();
                }

                // Update ground location
                await this.updateGroundLocation(lat, lng);

                // Update altitude chart
                this.updateAltitudeChart();

                // Calculate and update speed
                this.updateSpeed();
                console.log('✅ ISS position updated successfully');
            } else {
                throw new Error('Invalid data received from API');
            }
        } catch (error) {
            console.error('❌ Error updating ISS position:', error);
            
            // Use only HTTPS APIs - stick with main API for consistency
            try {
                console.log('🔄 Retrying main HTTPS API...');
                const fallbackResponse = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackData.latitude && fallbackData.longitude) {
                    const lat = parseFloat(fallbackData.latitude);
                    const lng = parseFloat(fallbackData.longitude);
                    
                    this.issMarker.setLatLng([lat, lng]);
                    document.getElementById('current-lat').textContent = `${lat.toFixed(4)}°`;
                    document.getElementById('current-lng').textContent = `${lng.toFixed(4)}°`;
                    console.log('✅ Fallback API worked');
                }
            } catch (fallbackError) {
                console.error('❌ Fallback API also failed:', fallbackError);
                this.showError('Unable to get ISS position. Retrying...');
            }
        }
    }

    async updateAstronauts() {
        try {
            console.log('👨‍🚀 Fetching astronaut data from HTTPS API...');
            
            // Try the HTTPS API first, then fallback to hardcoded data
            let data = null;
            
            try {
                const response = await fetch('https://www.howmanypeopleareinspacerightnow.com/peopleinspace.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
                console.log('✅ Successfully fetched astronaut data from API');
            } catch (apiError) {
                console.warn('❌ API failed, using fallback data:', apiError);
                // Fallback to hardcoded current astronaut data
                data = {
                    "people": [
                        {"craft": "ISS", "name": "Oleg Kononenko"},
                        {"craft": "ISS", "name": "Nikolai Chub"},
                        {"craft": "ISS", "name": "Tracy Caldwell Dyson"},
                        {"craft": "ISS", "name": "Matthew Dominick"},
                        {"craft": "ISS", "name": "Michael Barratt"},
                        {"craft": "ISS", "name": "Jeanette Epps"},
                        {"craft": "ISS", "name": "Alexander Grebenkin"},
                        {"craft": "ISS", "name": "Butch Wilmore"},
                        {"craft": "ISS", "name": "Sunita Williams"},
                        {"craft": "Tiangong", "name": "Li Guangsu"},
                        {"craft": "Tiangong", "name": "Li Cong"},
                        {"craft": "Tiangong", "name": "Ye Guangfu"}
                    ],
                    "number": 12,
                    "message": "success"
                };
            }
            
            console.log('👨‍🚀 Astronaut data:', data);

            if (data && (data.message === 'success' || data.people)) {
                const astronautsGrid = document.getElementById('astronauts-grid');
                if (!astronautsGrid) {
                    console.error('❌ Astronauts grid element not found');
                    return;
                }

                // Update astronaut count in hero and statistics
                const astronautCount = data.number || data.people?.length || 0;
                const astronautCountEl = document.getElementById('astronaut-count');
                const totalPeopleEl = document.getElementById('total-people');
                
                if (astronautCountEl) {
                    astronautCountEl.textContent = astronautCount;
                }
                if (totalPeopleEl) {
                    totalPeopleEl.textContent = astronautCount;
                }
                
                console.log(`✅ Updated astronaut count: ${astronautCount}`);

                // Group by craft
                const craftGroups = {};
                data.people.forEach(person => {
                    if (!craftGroups[person.craft]) {
                        craftGroups[person.craft] = [];
                    }
                    craftGroups[person.craft].push(person);
                });

                // Generate astronaut cards
                astronautsGrid.innerHTML = '';
                Object.entries(craftGroups).forEach(([craft, people]) => {
                    people.forEach((person, index) => {
                        const card = this.createAstronautCard(person, craft, index);
                        astronautsGrid.appendChild(card);
                    });
                });
            }
        } catch (error) {
            console.error('Error updating astronauts:', error);
        }
    }

    createAstronautCard(person, craft, index) {
        const card = document.createElement('div');
        card.className = 'astronaut-card';
        
        // Generate initials for avatar
        const initials = person.name.split(' ').map(n => n[0]).join('');
        
        // Generate mission info based on craft
        let missionInfo = '';
        if (craft === 'ISS') {
            missionInfo = 'Conducting scientific research and maintenance operations aboard the International Space Station.';
        } else if (craft === 'Tiangong') {
            missionInfo = 'Operating aboard China\'s Tiangong space station, conducting experiments and technology demonstrations.';
        }

        card.innerHTML = `
            <div class="astronaut-avatar">
                ${initials}
            </div>
            <h3 class="astronaut-name">${person.name}</h3>
            <div class="astronaut-craft">${craft}</div>
            <p class="astronaut-mission">${missionInfo}</p>
        `;

        return card;
    }

    async updateGroundLocation(lat, lng) {
        try {
            // Use a reverse geocoding service (example with OpenStreetMap Nominatim)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3`
            );
            const data = await response.json();

            let location = 'Over Ocean';
            if (data.display_name) {
                const parts = data.display_name.split(',');
                location = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0];
            }

            document.getElementById('ground-location').textContent = location;

            // Update local time (approximate)
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const localTime = new Date(utc + (lng / 15 * 3600000));
            document.getElementById('local-time').textContent = 
                localTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        } catch (error) {
            console.error('Error updating ground location:', error);
            document.getElementById('ground-location').textContent = 'Location unavailable';
        }
    }

    updateAltitudeChart() {
        if (!this.altitudeChart) return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Simulate slight altitude variations (ISS altitude varies slightly)
        const baseAltitude = 408;
        const variation = (Math.random() - 0.5) * 4; // ±2km variation
        const altitude = baseAltitude + variation;

        this.altitudeData.push({ time: timeLabel, altitude });

        // Keep only last 20 data points
        if (this.altitudeData.length > 20) {
            this.altitudeData.shift();
        }

        this.altitudeChart.data.labels = this.altitudeData.map(d => d.time);
        this.altitudeChart.data.datasets[0].data = this.altitudeData.map(d => d.altitude);
        this.altitudeChart.update('none');

        // Update current altitude display
        document.getElementById('current-alt').textContent = `${altitude.toFixed(1)} km`;
    }

    updateSpeed() {
        // ISS travels at approximately 27,600 km/h
        const baseSpeed = 27600;
        const variation = (Math.random() - 0.5) * 200; // Small variation
        const speed = baseSpeed + variation;

        document.getElementById('current-speed').textContent = `${speed.toFixed(0)} km/h`;
    }

    updateStatistics() {
        // Update orbits completed today (ISS completes ~15.5 orbits per day)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const hoursToday = (now - startOfDay) / (1000 * 60 * 60);
        const orbitsToday = Math.floor(hoursToday * (15.5 / 24));
        
        document.getElementById('orbits-today').textContent = orbitsToday;

        // Calculate mission duration (ISS has been operational since 2000)
        const missionStart = new Date('2000-11-02');
        const duration = now - missionStart;
        const years = Math.floor(duration / (1000 * 60 * 60 * 24 * 365.25));
        const days = Math.floor((duration % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
        
        document.getElementById('mission-duration').textContent = `${years}y ${days}d`;

        // Estimate distance traveled
        const totalDays = duration / (1000 * 60 * 60 * 24);
        const distancePerDay = 27600 * 24; // km per day
        const totalDistance = Math.floor(totalDays * distancePerDay);
        
        document.getElementById('distance-traveled').textContent = 
            `${(totalDistance / 1000000).toFixed(1)}M`;
    }

    centerMapOnISS() {
        if (this.issMarker) {
            const position = this.issMarker.getLatLng();
            this.map.setView(position, 4);
        }
    }

    toggleOrbitPath() {
        this.showOrbit = !this.showOrbit;
        const button = document.getElementById('toggle-orbit');
        
        if (this.showOrbit) {
            if (this.orbitPath.length > 1) {
                this.updateOrbitPath();
            }
            button.querySelector('.btn-title').textContent = 'Hide Orbit';
            button.querySelector('.btn-desc').textContent = 'Remove orbital path';
            button.querySelector('.btn-icon i').className = 'fas fa-eye-slash';
            button.classList.add('active');
        } else {
            // Remove orbit path
            if (this.orbitPolyline) {
                this.map.removeLayer(this.orbitPolyline);
                this.orbitPolyline = null;
            }
            if (this.directionMarker) {
                this.map.removeLayer(this.directionMarker);
                this.directionMarker = null;
            }
            button.querySelector('.btn-title').textContent = 'Show Orbit';
            button.querySelector('.btn-desc').textContent = 'Display orbital path';
            button.querySelector('.btn-icon i').className = 'fas fa-route';
            button.classList.remove('active');
        }
    }

    updateOrbitPath() {
        if (!this.showOrbit || this.orbitPath.length < 2) return;

        // Remove existing orbit path
        if (this.orbitPolyline) {
            this.map.removeLayer(this.orbitPolyline);
            this.orbitPolyline = null;
        }

        // Create the orbit path with better styling
        this.orbitPolyline = L.polyline(this.orbitPath, {
            color: '#0ea5e9',
            weight: 2,
            opacity: 0.8,
            dashArray: '5, 10',
            lineCap: 'round',
            lineJoin: 'round'
        });
        
        this.orbitPolyline.addTo(this.map);
        
        // Add direction indicators (arrows) to show ISS movement direction
        if (this.orbitPath.length > 2) {
            const lastPoint = this.orbitPath[this.orbitPath.length - 1];
            const secondLastPoint = this.orbitPath[this.orbitPath.length - 2];
            
            // Calculate direction
            const bearing = this.calculateBearing(secondLastPoint, lastPoint);
            
            // Add direction marker
            const directionIcon = L.divIcon({
                html: `<div style="transform: rotate(${bearing}deg); color: #0ea5e9; font-size: 16px;">➤</div>`,
                iconSize: [20, 20],
                className: 'orbit-direction'
            });
            
            if (this.directionMarker) {
                this.map.removeLayer(this.directionMarker);
            }
            
            this.directionMarker = L.marker(lastPoint, { icon: directionIcon }).addTo(this.map);
        }
    }

    calculateBearing(point1, point2) {
        const lat1 = point1[0] * Math.PI / 180;
        const lat2 = point2[0] * Math.PI / 180;
        const deltaLng = (point2[1] - point1[1]) * Math.PI / 180;
        
        const y = Math.sin(deltaLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
        
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    toggleNightLayer() {
        this.showNightLayer = !this.showNightLayer;
        const button = document.getElementById('toggle-night');
        
        if (this.showNightLayer) {
            // Add a simple night overlay
            this.addNightOverlay();
            button.querySelector('.btn-title').textContent = 'Day Mode';
            button.querySelector('.btn-desc').textContent = 'Remove night overlay';
            button.querySelector('.btn-icon i').className = 'fas fa-sun';
            button.classList.add('active');
        } else {
            // Remove night overlay
            this.removeNightOverlay();
            button.querySelector('.btn-title').textContent = 'Day/Night';
            button.querySelector('.btn-desc').textContent = 'Toggle night overlay';
            button.querySelector('.btn-icon i').className = 'fas fa-moon';
            button.classList.remove('active');
        }
    }

    addNightOverlay() {
        // Remove existing night layer
        this.removeNightOverlay();

        // Create a simple night overlay based on current UTC time
        const now = new Date();
        const utcHours = now.getUTCHours();
        
        // Calculate approximate solar longitude (simplified)
        const solarLongitude = (utcHours - 12) * 15; // Solar noon at 0°
        
        // Create night areas - areas where it's approximately night
        const nightPolygons = [];
        
        // Western night area (evening/night)
        const westLng = solarLongitude - 90;
        const eastLng = solarLongitude + 90;
        
        // Create night polygon (very simplified)
        if (westLng < eastLng) {
            // Normal case
            nightPolygons.push([
                [85, westLng],
                [85, eastLng],
                [-85, eastLng],
                [-85, westLng],
                [85, westLng]
            ]);
        } else {
            // Date line crossing case
            nightPolygons.push([
                [85, westLng],
                [85, 180],
                [-85, 180],
                [-85, westLng],
                [85, westLng]
            ]);
            nightPolygons.push([
                [85, -180],
                [85, eastLng],
                [-85, eastLng],
                [-85, -180],
                [85, -180]
            ]);
        }
        
        this.nightLayer = L.layerGroup();
        
        nightPolygons.forEach(coords => {
            const polygon = L.polygon(coords, {
                color: '#1a202c',
                fillColor: '#0d1117',
                fillOpacity: 0.3,
                weight: 1,
                opacity: 0.5
            });
            this.nightLayer.addLayer(polygon);
        });
        
        this.nightLayer.addTo(this.map);
    }

    removeNightOverlay() {
        if (this.nightLayer) {
            this.map.removeLayer(this.nightLayer);
            this.nightLayer = null;
        }
    }

    showError(message) {
        console.error(message);
        // You could implement a toast notification system here
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.altitudeChart) {
            this.altitudeChart.destroy();
        }
        if (this.orbitPolyline) {
            this.map.removeLayer(this.orbitPolyline);
        }
        if (this.directionMarker) {
            this.map.removeLayer(this.directionMarker);
        }
        if (this.nightLayer) {
            this.map.removeLayer(this.nightLayer);
        }
    }
}

// Utility functions
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m ${seconds % 60}s`;
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Enhanced ISS Pass Prediction (simplified version)
class ISSPassPredictor {
    constructor(latitude, longitude) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    async getNextPass() {
        try {
            // This would normally use a more sophisticated API
            // For demo purposes, we'll simulate pass data
            const now = new Date();
            const nextPass = new Date(now.getTime() + Math.random() * 6 * 60 * 60 * 1000); // Random time within 6 hours
            const duration = Math.floor(Math.random() * 8) + 2; // 2-10 minutes

            return {
                risetime: nextPass,
                duration: duration
            };
        } catch (error) {
            console.error('Error getting pass prediction:', error);
            return null;
        }
    }
}

// Initialize the ISS Tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌍 DOM Content Loaded');
    
    // Check if required libraries are loaded
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet library not loaded');
        alert('Map library failed to load. Please refresh the page.');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js library not loaded');
        alert('Chart library failed to load. Please refresh the page.');
        return;
    }
    
    try {
        console.log('🚀 Starting ISS Tracker initialization...');
        const tracker = new ISSTracker();
        
        // Make tracker globally available for debugging
        window.issTracker = tracker;
        
        console.log('✅ ISS Tracker initialized successfully');
        
        // Handle page visibility change to pause/resume tracking
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📱 Page hidden - pausing updates');
            } else {
                console.log('📱 Page visible - resuming updates');
                tracker.updateISSPosition();
                tracker.updateAstronauts();
            }
        });

        // Handle beforeunload to cleanup
        window.addEventListener('beforeunload', () => {
            tracker.destroy();
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize ISS Tracker:', error);
        alert('Failed to start ISS Tracker: ' + error.message);
    }

    // Geolocation for pass predictions
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const passPredictor = new ISSPassPredictor(latitude, longitude);
            
            try {
                const nextPass = await passPredictor.getNextPass();
                if (nextPass) {
                    const passTime = nextPass.risetime.toLocaleString();
                    document.getElementById('next-pass').textContent = passTime;
                    document.getElementById('pass-duration').textContent = `${nextPass.duration} minutes`;
                }
            } catch (error) {
                console.error('Error getting pass prediction:', error);
            }
        }, (error) => {
            console.log('Geolocation not available:', error);
            document.getElementById('next-pass').textContent = 'Location required';
        });
    }
});

// Service Worker registration for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Performance optimization: Intersection Observer for lazy loading
const lazyImages = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
        }
    });
});

lazyImages.forEach(img => imageObserver.observe(img));
