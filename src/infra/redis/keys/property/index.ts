



// This thing will return the keys for the properties, for the metrics and for the other metrics, so that we can use them in the code and avoid hardcoding the keys everywhere
export const GetPropertyKeyForOtherMetrics = (propertyId:number) => `property:${propertyId}:metrics`;
export const GetPropertyKeyForFinanceMetrics= (propertyId:number,year:number,month:number) => `property:${propertyId}:finance:metrics:${year}:${month}`;





export const GetOwnerKeyForPropertyMetrics = (ownerId:number) => `owner:${ownerId}:property:metrics`;
export const GetOwnerKeyForFinanceMetrics = (ownerId:number,year:number,month:number) => `owner:${ownerId}:finance:metrics:${year}:${month}`;