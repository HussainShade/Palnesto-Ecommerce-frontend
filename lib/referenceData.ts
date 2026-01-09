/**
 * Reference Data Helper
 * 
 * Since the backend uses MongoDB ObjectIds for shirtSizeId and shirtTypeId,
 * but the frontend works with string values (M, L, XL, XXL, Casual, Formal, etc.),
 * we need to map between them.
 * 
 * This helper extracts reference data from API responses and caches it.
 */

import type { ShirtSize, ShirtType, SizeReference, ShirtSizeReference, ShirtTypeReference, BackendShirt, GroupedShirtResponse } from '@/types';

interface ReferenceDataCache {
  sizes: Map<ShirtSize, string>; // Map size name to ObjectId
  types: Map<ShirtType, string>; // Map type name to ObjectId
  sizeObjects: Map<string, ShirtSizeReference>; // Map ObjectId to size object
  typeObjects: Map<string, ShirtTypeReference>; // Map ObjectId to type object
}

class ReferenceDataManager {
  private cache: ReferenceDataCache = {
    sizes: new Map(),
    types: new Map(),
    sizeObjects: new Map(),
    typeObjects: new Map(),
  };

  /**
   * Extract reference data from a backend shirt response (ShirtSize document)
   */
  extractFromShirt(shirt: BackendShirt): void {
    // Extract size reference - NEW API uses sizeRef or sizeReference
    if (shirt.sizeRef) {
      const sizeRef = shirt.sizeRef as SizeReference;
      this.cache.sizes.set(sizeRef.name, sizeRef._id);
      this.cache.sizeObjects.set(sizeRef._id, sizeRef);
    } else if (shirt.sizeReference) {
      const sizeRef = shirt.sizeReference as SizeReference;
      this.cache.sizes.set(sizeRef.name, sizeRef._id);
      this.cache.sizeObjects.set(sizeRef._id, sizeRef);
    }
    // Note: If we only have sizeReferenceId without the populated object,
    // we can't extract the size name. This will be populated when we get
    // a response with the populated sizeReference object.

    // Extract type reference
    if (shirt.shirtType) {
      if (typeof shirt.shirtType === 'object' && shirt.shirtType._id) {
        const typeRef = shirt.shirtType as ShirtTypeReference;
        this.cache.types.set(typeRef.name, typeRef._id);
        this.cache.typeObjects.set(typeRef._id, typeRef);
      }
    } else if (shirt.type && shirt.shirtTypeId) {
      // Legacy support
      this.cache.types.set(shirt.type, shirt.shirtTypeId);
    }
  }

  /**
   * Extract reference data from grouped shirt response
   */
  extractFromGroupedShirt(groupedShirt: GroupedShirtResponse): void {
    // Extract type reference
    if (groupedShirt.shirtType) {
      if (typeof groupedShirt.shirtType === 'object' && (groupedShirt.shirtType as ShirtTypeReference)._id) {
        const typeRef = groupedShirt.shirtType as ShirtTypeReference;
        this.cache.types.set(typeRef.name, typeRef._id);
        this.cache.typeObjects.set(typeRef._id, typeRef);
      }
    } else if (groupedShirt.type && groupedShirt.shirtTypeId) {
      this.cache.types.set(groupedShirt.type, groupedShirt.shirtTypeId);
    }

    // Extract size references from variants - NEW API uses sizeRef or sizeReference
    if (groupedShirt.variants) {
      groupedShirt.variants.forEach(variant => {
        if (variant.sizeRef) {
          const sizeRef = variant.sizeRef as SizeReference;
          this.cache.sizes.set(sizeRef.name, sizeRef._id);
          this.cache.sizeObjects.set(sizeRef._id, sizeRef);
        } else if (variant.sizeReference) {
          const sizeRef = variant.sizeReference as SizeReference;
          this.cache.sizes.set(sizeRef.name, sizeRef._id);
          this.cache.sizeObjects.set(sizeRef._id, sizeRef);
        }
        // Note: If we only have sizeReferenceId without the populated object,
        // we can't extract the size name. This will be populated when we get
        // a response with the populated sizeReference object.
      });
    }
  }

  /**
   * Get ObjectId for a size name
   */
  getSizeId(size: ShirtSize): string | null {
    return this.cache.sizes.get(size) || null;
  }

  /**
   * Get ObjectId for a type name
   */
  getTypeId(type: ShirtType): string | null {
    return this.cache.types.get(type) || null;
  }

  /**
   * Get size name from ObjectId
   */
  getSizeName(sizeId: string): ShirtSize | null {
    const sizeObj = this.cache.sizeObjects.get(sizeId);
    return sizeObj ? sizeObj.name : null;
  }

  /**
   * Get type name from ObjectId
   */
  getTypeName(typeId: string): ShirtType | null {
    const typeObj = this.cache.typeObjects.get(typeId);
    return typeObj ? typeObj.name : null;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.sizes.clear();
    this.cache.types.clear();
    this.cache.sizeObjects.clear();
    this.cache.typeObjects.clear();
  }
}

// Singleton instance
export const referenceDataManager = new ReferenceDataManager();
