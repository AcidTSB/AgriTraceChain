package com.agritrace.product.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis Cache Configuration for Product Service
 *
 * <p><b>Architecture Decision:</b> We use Spring Cache abstraction with Redis as the store.
 * This allows swapping the cache backend without changing business code (just change config).</p>
 *
 * <p><b>Cache Strategy:</b>
 * <ul>
 *   <li>product-detail: Long TTL (1 hour) – product catalog changes rarely</li>
 *   <li>batch-detail: Medium TTL (5 min) – batch status changes occasionally</li>
 *   <li>batch-list: Short TTL (1 min) – list views can tolerate slight staleness</li>
 * </ul></p>
 *
 * <p><b>Cache Invalidation:</b> On batch create/update operations, the relevant cache
 * entries are evicted via @CacheEvict. This is simpler than TTL-only invalidation
 * and ensures data consistency for write operations.</p>
 *
 * <p><b>Security:</b> Cache keys include userId for user-specific caches to prevent
 * information leakage between users. Public endpoints use global keys.</p>
 *
 * <p><b>Tradeoff:</b> Redis adds infrastructure complexity and potential cache stampede
 * on cold start. Mitigated by staggered TTLs and Redis availability checks in healthchecks.</p>
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String CACHE_PRODUCT_DETAIL = "product-detail";
    public static final String CACHE_BATCH_DETAIL = "batch-detail";
    public static final String CACHE_BATCH_LIST = "batch-list";
    public static final String CACHE_BATCH_PUBLIC = "batch-public";

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        // Include type info for proper deserialization of polymorphic types
        mapper.activateDefaultTyping(
                mapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer())
                )
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                )
                // Don't cache null values (prevents null-poisoning attack)
                .disableCachingNullValues();

        // Per-cache TTL overrides
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        cacheConfigs.put(CACHE_PRODUCT_DETAIL,
                defaultConfig.entryTtl(Duration.ofHours(1)));  // Product catalog is stable

        cacheConfigs.put(CACHE_BATCH_DETAIL,
                defaultConfig.entryTtl(Duration.ofMinutes(5)));  // Batch status changes

        cacheConfigs.put(CACHE_BATCH_LIST,
                defaultConfig.entryTtl(Duration.ofMinutes(1)));  // List tolerate staleness

        cacheConfigs.put(CACHE_BATCH_PUBLIC,
                defaultConfig.entryTtl(Duration.ofMinutes(10)));  // Public trace – cache longer

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
