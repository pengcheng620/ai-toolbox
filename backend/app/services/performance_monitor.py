"""Performance monitoring and optimization service."""

import time
import asyncio
from typing import Dict, Any, List, Optional, Callable
from functools import wraps
from datetime import datetime, timedelta
import json

from app.utils.logger import get_logger

logger = get_logger(__name__)


class PerformanceMonitor:
    """Service for monitoring and optimizing Sprint Planning performance."""

    def __init__(self):
        """Initialize Performance Monitor."""
        self.metrics = {
            "api_calls": {},
            "response_times": {},
            "error_rates": {},
            "cache_hits": {},
            "memory_usage": {},
            "concurrent_users": 0
        }
        self.cache = {}
        self.cache_ttl = {}
        self.performance_thresholds = {
            "api_response_time": 2.0,  # seconds
            "cache_hit_rate": 0.8,     # 80%
            "error_rate": 0.05,        # 5%
            "memory_usage": 0.8        # 80%
        }
        logger.info("Performance Monitor initialized")

    def performance_tracker(self, operation_name: str):
        """Decorator to track performance of operations."""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.time()
                operation_id = f"{operation_name}_{int(start_time)}"
                
                try:
                    # Track start
                    self._track_operation_start(operation_name, operation_id)
                    
                    # Execute function
                    if asyncio.iscoroutinefunction(func):
                        result = await func(*args, **kwargs)
                    else:
                        result = func(*args, **kwargs)
                    
                    # Track success
                    end_time = time.time()
                    response_time = end_time - start_time
                    self._track_operation_success(operation_name, operation_id, response_time)
                    
                    return result
                    
                except Exception as e:
                    # Track error
                    end_time = time.time()
                    response_time = end_time - start_time
                    self._track_operation_error(operation_name, operation_id, response_time, str(e))
                    raise
                    
            return wrapper
        return decorator

    def _track_operation_start(self, operation_name: str, operation_id: str):
        """Track the start of an operation."""
        if operation_name not in self.metrics["api_calls"]:
            self.metrics["api_calls"][operation_name] = {
                "total_calls": 0,
                "successful_calls": 0,
                "failed_calls": 0,
                "active_calls": 0
            }
        
        self.metrics["api_calls"][operation_name]["total_calls"] += 1
        self.metrics["api_calls"][operation_name]["active_calls"] += 1

    def _track_operation_success(self, operation_name: str, operation_id: str, response_time: float):
        """Track successful operation completion."""
        self.metrics["api_calls"][operation_name]["successful_calls"] += 1
        self.metrics["api_calls"][operation_name]["active_calls"] -= 1
        
        # Track response time
        if operation_name not in self.metrics["response_times"]:
            self.metrics["response_times"][operation_name] = []
        
        self.metrics["response_times"][operation_name].append({
            "timestamp": datetime.now().isoformat(),
            "response_time": response_time,
            "operation_id": operation_id
        })
        
        # Keep only last 100 entries
        if len(self.metrics["response_times"][operation_name]) > 100:
            self.metrics["response_times"][operation_name] = self.metrics["response_times"][operation_name][-100:]
        
        # Log slow operations
        if response_time > self.performance_thresholds["api_response_time"]:
            logger.warning(f"Slow operation detected: {operation_name} took {response_time:.2f}s")

    def _track_operation_error(self, operation_name: str, operation_id: str, response_time: float, error: str):
        """Track failed operation."""
        self.metrics["api_calls"][operation_name]["failed_calls"] += 1
        self.metrics["api_calls"][operation_name]["active_calls"] -= 1
        
        # Track error rate
        if operation_name not in self.metrics["error_rates"]:
            self.metrics["error_rates"][operation_name] = []
        
        self.metrics["error_rates"][operation_name].append({
            "timestamp": datetime.now().isoformat(),
            "error": error,
            "response_time": response_time,
            "operation_id": operation_id
        })
        
        # Keep only last 50 errors
        if len(self.metrics["error_rates"][operation_name]) > 50:
            self.metrics["error_rates"][operation_name] = self.metrics["error_rates"][operation_name][-50:]

    def cache_result(self, key: str, data: Any, ttl_seconds: int = 300):
        """Cache result with TTL."""
        self.cache[key] = data
        self.cache_ttl[key] = datetime.now() + timedelta(seconds=ttl_seconds)
        
        # Track cache usage
        if "cache_sets" not in self.metrics["cache_hits"]:
            self.metrics["cache_hits"]["cache_sets"] = 0
        self.metrics["cache_hits"]["cache_sets"] += 1

    def get_cached_result(self, key: str) -> Optional[Any]:
        """Get cached result if not expired."""
        if key in self.cache and key in self.cache_ttl:
            if datetime.now() < self.cache_ttl[key]:
                # Cache hit
                if "cache_hits" not in self.metrics["cache_hits"]:
                    self.metrics["cache_hits"]["cache_hits"] = 0
                self.metrics["cache_hits"]["cache_hits"] += 1
                return self.cache[key]
            else:
                # Cache expired
                del self.cache[key]
                del self.cache_ttl[key]
        
        # Cache miss
        if "cache_misses" not in self.metrics["cache_hits"]:
            self.metrics["cache_hits"]["cache_misses"] = 0
        self.metrics["cache_hits"]["cache_misses"] += 1
        return None

    def clear_expired_cache(self):
        """Clear expired cache entries."""
        now = datetime.now()
        expired_keys = [key for key, expiry in self.cache_ttl.items() if now >= expiry]
        
        for key in expired_keys:
            del self.cache[key]
            del self.cache_ttl[key]
        
        if expired_keys:
            logger.info(f"Cleared {len(expired_keys)} expired cache entries")

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        # Calculate derived metrics
        metrics_summary = {
            "timestamp": datetime.now().isoformat(),
            "api_performance": {},
            "cache_performance": {},
            "system_health": {},
            "alerts": []
        }
        
        # API Performance
        for operation, stats in self.metrics["api_calls"].items():
            total_calls = stats["total_calls"]
            if total_calls > 0:
                success_rate = stats["successful_calls"] / total_calls
                error_rate = stats["failed_calls"] / total_calls
                
                # Calculate average response time
                response_times = self.metrics["response_times"].get(operation, [])
                avg_response_time = 0
                if response_times:
                    avg_response_time = sum(rt["response_time"] for rt in response_times[-10:]) / min(len(response_times), 10)
                
                metrics_summary["api_performance"][operation] = {
                    "total_calls": total_calls,
                    "success_rate": round(success_rate, 3),
                    "error_rate": round(error_rate, 3),
                    "avg_response_time": round(avg_response_time, 3),
                    "active_calls": stats["active_calls"]
                }
                
                # Check for alerts
                if error_rate > self.performance_thresholds["error_rate"]:
                    metrics_summary["alerts"].append({
                        "type": "high_error_rate",
                        "operation": operation,
                        "value": error_rate,
                        "threshold": self.performance_thresholds["error_rate"]
                    })
                
                if avg_response_time > self.performance_thresholds["api_response_time"]:
                    metrics_summary["alerts"].append({
                        "type": "slow_response",
                        "operation": operation,
                        "value": avg_response_time,
                        "threshold": self.performance_thresholds["api_response_time"]
                    })
        
        # Cache Performance
        cache_hits = self.metrics["cache_hits"].get("cache_hits", 0)
        cache_misses = self.metrics["cache_hits"].get("cache_misses", 0)
        total_cache_requests = cache_hits + cache_misses
        
        if total_cache_requests > 0:
            cache_hit_rate = cache_hits / total_cache_requests
            metrics_summary["cache_performance"] = {
                "hit_rate": round(cache_hit_rate, 3),
                "total_requests": total_cache_requests,
                "cache_size": len(self.cache)
            }
            
            if cache_hit_rate < self.performance_thresholds["cache_hit_rate"]:
                metrics_summary["alerts"].append({
                    "type": "low_cache_hit_rate",
                    "value": cache_hit_rate,
                    "threshold": self.performance_thresholds["cache_hit_rate"]
                })
        
        # System Health
        metrics_summary["system_health"] = {
            "concurrent_users": self.metrics["concurrent_users"],
            "cache_entries": len(self.cache),
            "uptime": "N/A",  # Would be calculated from service start time
            "status": "healthy" if len(metrics_summary["alerts"]) == 0 else "degraded"
        }
        
        return metrics_summary

    def optimize_performance(self) -> Dict[str, Any]:
        """Analyze performance and suggest optimizations."""
        metrics = self.get_performance_metrics()
        optimizations = {
            "recommendations": [],
            "auto_applied": [],
            "manual_actions": []
        }
        
        # Cache optimization
        cache_performance = metrics.get("cache_performance", {})
        if cache_performance.get("hit_rate", 0) < 0.7:
            optimizations["recommendations"].append({
                "type": "cache_optimization",
                "description": "Cache hit rate is low. Consider increasing cache TTL or caching more data.",
                "priority": "medium",
                "impact": "response_time"
            })
        
        # API optimization
        for operation, perf in metrics.get("api_performance", {}).items():
            if perf.get("avg_response_time", 0) > 1.0:
                optimizations["recommendations"].append({
                    "type": "api_optimization",
                    "operation": operation,
                    "description": f"Operation {operation} has slow response time ({perf['avg_response_time']}s)",
                    "priority": "high",
                    "impact": "user_experience"
                })
        
        # Auto-apply safe optimizations
        self.clear_expired_cache()
        optimizations["auto_applied"].append("Cleared expired cache entries")
        
        # Memory optimization
        if len(self.cache) > 1000:
            # Remove oldest cache entries
            sorted_cache = sorted(self.cache_ttl.items(), key=lambda x: x[1])
            for key, _ in sorted_cache[:100]:  # Remove oldest 100 entries
                if key in self.cache:
                    del self.cache[key]
                if key in self.cache_ttl:
                    del self.cache_ttl[key]
            optimizations["auto_applied"].append("Removed oldest cache entries to free memory")
        
        return optimizations

    def create_error_boundary(self, operation_name: str):
        """Create error boundary for operations."""
        def error_boundary(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                try:
                    if asyncio.iscoroutinefunction(func):
                        return await func(*args, **kwargs)
                    else:
                        return func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Error in {operation_name}: {str(e)}")
                    
                    # Return fallback response
                    return {
                        "success": False,
                        "error": f"Operation {operation_name} failed",
                        "fallback": True,
                        "timestamp": datetime.now().isoformat()
                    }
            return wrapper
        return error_boundary

    def health_check(self) -> Dict[str, Any]:
        """Perform system health check."""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {},
            "overall_score": 100
        }
        
        # Check API performance
        metrics = self.get_performance_metrics()
        api_health = 100
        
        for operation, perf in metrics.get("api_performance", {}).items():
            if perf.get("error_rate", 0) > 0.1:  # 10% error rate
                api_health -= 20
            if perf.get("avg_response_time", 0) > 3.0:  # 3 second response time
                api_health -= 15
        
        health_status["checks"]["api_performance"] = {
            "status": "healthy" if api_health > 70 else "degraded",
            "score": max(0, api_health)
        }
        
        # Check cache performance
        cache_perf = metrics.get("cache_performance", {})
        cache_health = 100
        if cache_perf.get("hit_rate", 0) < 0.5:
            cache_health = 60
        
        health_status["checks"]["cache_performance"] = {
            "status": "healthy" if cache_health > 70 else "degraded",
            "score": cache_health
        }
        
        # Check system resources
        system_health = 100
        if len(self.cache) > 2000:  # Too many cache entries
            system_health -= 20
        
        health_status["checks"]["system_resources"] = {
            "status": "healthy" if system_health > 70 else "degraded",
            "score": system_health
        }
        
        # Calculate overall score
        overall_score = (api_health + cache_health + system_health) / 3
        health_status["overall_score"] = round(overall_score)
        health_status["status"] = "healthy" if overall_score > 70 else "degraded"
        
        return health_status

    def reset_metrics(self):
        """Reset all metrics (for testing purposes)."""
        self.metrics = {
            "api_calls": {},
            "response_times": {},
            "error_rates": {},
            "cache_hits": {},
            "memory_usage": {},
            "concurrent_users": 0
        }
        self.cache.clear()
        self.cache_ttl.clear()
        logger.info("Performance metrics reset")


# Global Performance Monitor instance
performance_monitor = PerformanceMonitor()
