import { Logger, Injectable } from "@nestjs/common";
import { RedisService } from "src/infra/redis/redis.service";

const TTL = {
    PROPERTIES_BY_OWNER: 300,
    ROOMS_BY_PROPERTY: 300,
    ROOM_DETAILS: 600,
};

@Injectable()
export class PropertyCacheManager {
    private readonly logger = new Logger(PropertyCacheManager.name);

    constructor(private readonly cacheProvider: RedisService) {}

    private ownerPropertiesKey(ownerId: number): string {
        return `property:owner:${ownerId}`;
    }

    private propertyRoomsKey(propertyId: number): string {
        return `property:${propertyId}:rooms`;
    }

    private roomDetailsKey(roomId: number): string {
        return `property:room:${roomId}`;
    }

    async cachePropertiesByOwner(ownerId: number, data: any[]): Promise<void> {
        await this.cacheProvider.set(
            this.ownerPropertiesKey(ownerId),
            JSON.stringify(data),
            TTL.PROPERTIES_BY_OWNER,
        );
    }

    async getPropertiesByOwner(ownerId: number): Promise<any[] | null> {
        const cached = await this.cacheProvider.get(this.ownerPropertiesKey(ownerId));
        if (!cached) return null;
        try {
            return JSON.parse(cached);
        } catch {
            this.logger.warn(`Failed to parse cached properties for owner ${ownerId}`);
            return null;
        }
    }

    async invalidatePropertiesByOwner(ownerId: number): Promise<void> {
        await this.cacheProvider.del(this.ownerPropertiesKey(ownerId));
    }

    async cacheRoomsByProperty(propertyId: number, data: any[]): Promise<void> {
        await this.cacheProvider.set(
            this.propertyRoomsKey(propertyId),
            JSON.stringify(data),
            TTL.ROOMS_BY_PROPERTY,
        );
    }

    async getRoomsByProperty(propertyId: number): Promise<any[] | null> {
        const cached = await this.cacheProvider.get(this.propertyRoomsKey(propertyId));
        if (!cached) return null;
        try {
            return JSON.parse(cached);
        } catch {
            this.logger.warn(`Failed to parse cached rooms for property ${propertyId}`);
            return null;
        }
    }

    async invalidateRoomsByProperty(propertyId: number): Promise<void> {
        await this.cacheProvider.del(this.propertyRoomsKey(propertyId));
    }

    async cacheRoomDetails(roomId: number, data: any): Promise<void> {
        await this.cacheProvider.set(
            this.roomDetailsKey(roomId),
            JSON.stringify(data),
            TTL.ROOM_DETAILS,
        );
    }

    async getRoomDetails(roomId: number): Promise<any | null> {
        const cached = await this.cacheProvider.get(this.roomDetailsKey(roomId));
        if (!cached) return null;
        try {
            return JSON.parse(cached);
        } catch {
            this.logger.warn(`Failed to parse cached room details for room ${roomId}`);
            return null;
        }
    }

    async invalidateRoomDetails(roomId: number): Promise<void> {
        await this.cacheProvider.del(this.roomDetailsKey(roomId));
    }

    async invalidateRoomAndPropertyRooms(roomId: number, propertyId: number): Promise<void> {
        await Promise.all([
            this.invalidateRoomDetails(roomId),
            this.invalidateRoomsByProperty(propertyId),
        ]);
    }
}
