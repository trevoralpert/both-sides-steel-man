import { Injectable, Logger } from '@nestjs/common';
import { LinkPreviewDto } from '../dto/rich-content.dto';
import * as cheerio from 'cheerio';

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);
  private readonly cache = new Map<string, LinkPreviewDto>();
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private readonly timeout = 5000; // 5 seconds timeout
  private readonly maxRedirects = 3;

  /**
   * Generate link preview for a URL
   */
  async generateLinkPreview(url: string): Promise<LinkPreviewDto> {
    // Check cache first
    const cached = this.getCachedPreview(url);
    if (cached) {
      return cached;
    }

    // Validate URL
    if (!this.isValidUrl(url)) {
      return this.createErrorPreview(url, 'Invalid URL format');
    }

    // Check if URL is safe to fetch
    if (!this.isSafeUrl(url)) {
      return this.createErrorPreview(url, 'URL not allowed for security reasons');
    }

    try {
      const preview = await this.fetchUrlMetadata(url);
      this.cachePreview(url, preview);
      return preview;
    } catch (error) {
      this.logger.warn(`Failed to generate preview for ${url}:`, error.message);
      return this.createErrorPreview(url, error.message);
    }
  }

  /**
   * Generate multiple link previews in parallel
   */
  async generateLinkPreviews(urls: string[]): Promise<LinkPreviewDto[]> {
    const uniqueUrls = [...new Set(urls)]; // Remove duplicates
    
    // Limit concurrent requests to prevent overwhelming servers
    const batchSize = 5;
    const results: LinkPreviewDto[] = [];
    
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.generateLinkPreview(url));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(this.createErrorPreview(batch[index], result.reason?.message || 'Unknown error'));
        }
      });
    }

    return results;
  }

  /**
   * Validate if URLs are suitable for educational content
   */
  validateEducationalSources(urls: string[]): { url: string; isEducational: boolean; score: number; reason?: string }[] {
    return urls.map(url => {
      const domain = this.extractDomain(url);
      const educationalScore = this.calculateEducationalScore(domain);
      
      return {
        url,
        isEducational: educationalScore >= 0.6,
        score: educationalScore,
        reason: this.getEducationalReason(domain, educationalScore),
      };
    });
  }

  private async fetchUrlMetadata(url: string): Promise<LinkPreviewDto> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BothSides-Bot/1.0; Educational Content Preview)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return this.createBasicPreview(url, response.status);
      }

      const html = await response.text();
      return this.parseHtmlMetadata(url, html, response.status);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private parseHtmlMetadata(url: string, html: string, statusCode: number): LinkPreviewDto {
    const $ = cheerio.load(html);
    const domain = this.extractDomain(url);

    // Extract Open Graph metadata
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');

    // Extract Twitter Card metadata as fallback
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterDescription = $('meta[name="twitter:description"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');

    // Extract basic HTML metadata
    const htmlTitle = $('title').text().trim();
    const htmlDescription = $('meta[name="description"]').attr('content');
    const favicon = this.extractFavicon($, url);

    // Determine best values
    const title = ogTitle || twitterTitle || htmlTitle || domain;
    const description = this.truncateDescription(
      ogDescription || twitterDescription || htmlDescription || ''
    );
    const image = this.resolveImageUrl(ogImage || twitterImage || '', url);

    return {
      url,
      title: this.sanitizeText(title),
      description: this.sanitizeText(description),
      image,
      siteName: this.sanitizeText(ogSiteName || domain),
      favicon,
      statusCode,
    };
  }

  private extractFavicon($: cheerio.CheerioAPI, url: string): string | undefined {
    // Try different favicon selectors
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];

    for (const selector of selectors) {
      const href = $(selector).attr('href');
      if (href) {
        return this.resolveImageUrl(href, url);
      }
    }

    // Default favicon location
    const domain = this.extractDomain(url);
    return `https://${domain}/favicon.ico`;
  }

  private resolveImageUrl(imageUrl: string, baseUrl: string): string | undefined {
    if (!imageUrl) return undefined;

    try {
      // If already absolute URL, return as is
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }

      // Resolve relative URLs
      const base = new URL(baseUrl);
      const resolved = new URL(imageUrl, base);
      return resolved.toString();
    } catch {
      return undefined;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private isSafeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      
      // Block local/private networks
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0'
      ) {
        return false;
      }

      // Block known malicious or inappropriate domains
      const blockedDomains = [
        // Add domains to block as needed
        'malware-example.com',
        'phishing-example.com',
      ];

      return !blockedDomains.includes(hostname);
    } catch {
      return false;
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'Unknown';
    }
  }

  private calculateEducationalScore(domain: string): number {
    const educationalDomains = [
      '.edu', '.gov', '.org',
      'wikipedia.org', 'britannica.com', 'scholastic.com',
      'khanacademy.org', 'coursera.org', 'edx.org',
      'mit.edu', 'harvard.edu', 'stanford.edu',
      'nature.com', 'science.org', 'ncbi.nlm.nih.gov',
      'bbc.com', 'reuters.com', 'npr.org',
    ];

    const commercialDomains = [
      '.com', '.net', '.biz',
    ];

    // High score for educational domains
    for (const eduDomain of educationalDomains) {
      if (domain.includes(eduDomain)) {
        return 0.9;
      }
    }

    // Medium score for news organizations
    const newsDomains = ['news', 'times', 'post', 'journal', 'tribune'];
    for (const newsDomain of newsDomains) {
      if (domain.includes(newsDomain)) {
        return 0.7;
      }
    }

    // Lower score for commercial domains
    for (const commDomain of commercialDomains) {
      if (domain.endsWith(commDomain)) {
        return 0.5;
      }
    }

    return 0.3; // Default score
  }

  private getEducationalReason(domain: string, score: number): string | undefined {
    if (score >= 0.8) {
      return 'Recognized educational or authoritative source';
    }
    if (score >= 0.6) {
      return 'Credible news or educational content';
    }
    if (score >= 0.4) {
      return 'Commercial source - verify credibility';
    }
    return 'Source credibility unknown - use with caution';
  }

  private sanitizeText(text: string): string {
    if (!text) return '';
    
    // Remove HTML tags and decode entities
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private truncateDescription(description: string, maxLength: number = 200): string {
    if (!description) return '';
    
    if (description.length <= maxLength) {
      return description;
    }
    
    // Find last space before maxLength to avoid cutting words
    const truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) { // If last space is reasonable close to limit
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  private createErrorPreview(url: string, error: string): LinkPreviewDto {
    return {
      url,
      title: this.extractDomain(url),
      description: 'Link preview unavailable',
      error,
      statusCode: 0,
    };
  }

  private createBasicPreview(url: string, statusCode: number): LinkPreviewDto {
    const domain = this.extractDomain(url);
    return {
      url,
      title: domain,
      description: 'Non-HTML content',
      siteName: domain,
      statusCode,
    };
  }

  private getCachedPreview(url: string): LinkPreviewDto | undefined {
    const cached = this.cache.get(url);
    if (!cached) return undefined;

    // Check if cache entry is still valid
    const now = Date.now();
    const cacheTime = (cached as any)._cacheTime || 0;
    
    if (now - cacheTime > this.cacheExpiry) {
      this.cache.delete(url);
      return undefined;
    }

    return cached;
  }

  private cachePreview(url: string, preview: LinkPreviewDto): void {
    // Add cache timestamp
    (preview as any)._cacheTime = Date.now();
    
    // Limit cache size
    if (this.cache.size >= 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(url, preview);
  }
}
