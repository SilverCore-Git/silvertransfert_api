import type { Request } from 'express';

export default (req: Request): string => {
    return (
        req.headers['x-forwarded-for']?.toString().split(',')[0] || 
        (req.connection?.remoteAddress as string | undefined) || 
        (req.socket?.remoteAddress as string | undefined) || 
        req.ip || 
        '0.0.0.0'
    );
};
