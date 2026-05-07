export declare class AuditQueryDto {
    action?: string;
    result?: 'OK' | 'FAIL';
    actorEmail?: string;
    resourceType?: string;
    resourceId?: string;
    from?: string;
    to?: string;
    page?: string;
    pageSize?: string;
}
