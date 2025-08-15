import { Injectable } from '@nestjs/common';
import { FormattedContentDto, LinkPreviewDto, AttachmentDto } from '../dto/rich-content.dto';

@Injectable()
export class ContentFormattingService {
  private readonly mentionPattern = /@([a-zA-Z0-9_]+)/g;
  private readonly urlPattern = /(https?:\/\/[^\s]+)/gi;
  private readonly markdownPatterns = {
    bold: /\*\*(.*?)\*\*/g,
    italic: /\*(.*?)\*/g,
    code: /`([^`]+)`/g,
    codeBlock: /```([\s\S]*?)```/g,
    quote: /^> (.+)$/gm,
    strikethrough: /~~(.*?)~~/g,
    underline: /_([^_]+)_/g,
  };

  /**
   * Parse markdown content and generate formatted output
   */
  parseMarkdown(content: string): FormattedContentDto {
    const plainText = this.stripMarkdown(content);
    const htmlContent = this.markdownToHtml(content);
    const mentions = this.extractMentions(content);
    const linkPreviews = this.extractLinks(content);
    
    return {
      plainText,
      htmlContent,
      markdownContent: content,
      mentions,
      metadata: {
        wordCount: plainText.trim().split(/\s+/).length,
        characterCount: plainText.length,
        linkCount: linkPreviews.length,
        attachmentCount: 0,
        estimatedReadTime: Math.ceil(plainText.trim().split(/\s+/).length / 200), // ~200 words per minute
      },
    };
  }

  /**
   * Sanitize content to remove potentially dangerous HTML/scripts
   */
  sanitizeContent(content: string): string {
    // Remove script tags and their content
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove potentially dangerous attributes
    content = content.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, ''); // onclick, onload, etc.
    content = content.replace(/javascript:/gi, ''); // javascript: protocols
    content = content.replace(/data:/gi, ''); // data: protocols (can be dangerous)
    
    // Remove iframe tags
    content = content.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    
    // Remove object and embed tags
    content = content.replace(/<(object|embed)[^>]*>.*?<\/\1>/gi, '');
    
    return content.trim();
  }

  /**
   * Extract @mentions from content
   */
  extractMentions(content: string): string[] {
    const mentions: string[] = [];
    let match;
    
    while ((match = this.mentionPattern.exec(content)) !== null) {
      const username = match[1];
      if (!mentions.includes(username)) {
        mentions.push(username);
      }
    }
    
    return mentions;
  }

  /**
   * Extract URLs from content for link preview generation
   */
  extractLinks(content: string): string[] {
    const links: string[] = [];
    let match;
    
    while ((match = this.urlPattern.exec(content)) !== null) {
      const url = match[0];
      if (!links.includes(url)) {
        links.push(url);
      }
    }
    
    return links;
  }

  /**
   * Validate and process attachments
   */
  processAttachments(attachments: AttachmentDto[]): AttachmentDto[] {
    return attachments.map(attachment => {
      // Validate attachment based on type
      switch (attachment.type) {
        case 'image':
          return this.processImageAttachment(attachment);
        case 'file':
          return this.processFileAttachment(attachment);
        case 'link':
          return this.processLinkAttachment(attachment);
        default:
          throw new Error(`Unsupported attachment type: ${attachment.type}`);
      }
    });
  }

  /**
   * Generate rich content summary for notifications
   */
  generateContentSummary(content: FormattedContentDto, maxLength: number = 150): string {
    let summary = content.plainText;
    
    // Add attachment context
    if (content.attachments && content.attachments.length > 0) {
      const attachmentTypes = content.attachments.map(a => a.type);
      const attachmentSummary = this.generateAttachmentSummary(attachmentTypes);
      summary += ` ${attachmentSummary}`;
    }
    
    // Add link context
    if (content.linkPreviews && content.linkPreviews.length > 0) {
      summary += ` (${content.linkPreviews.length} link${content.linkPreviews.length > 1 ? 's' : ''})`;
    }
    
    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }

  /**
   * Check if content contains educational/debate-appropriate formatting
   */
  validateDebateContent(content: FormattedContentDto): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check for excessive formatting
    const formatting = content.formatting;
    if (formatting) {
      const formatCount = Object.values(formatting).filter(Boolean).length;
      if (formatCount > 5) {
        warnings.push('Excessive text formatting may distract from debate content');
      }
    }
    
    // Check for too many attachments
    if (content.attachments && content.attachments.length > 3) {
      warnings.push('Consider limiting attachments to focus on key evidence');
    }
    
    // Check for appropriate content length
    if (content.metadata?.wordCount && content.metadata.wordCount < 5) {
      warnings.push('Message may be too short to contribute meaningfully to debate');
    }
    
    if (content.metadata?.wordCount && content.metadata.wordCount > 200) {
      warnings.push('Long messages may be difficult for opponents to respond to effectively');
    }
    
    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  private stripMarkdown(content: string): string {
    let plainText = content;
    
    // Remove markdown formatting
    plainText = plainText.replace(this.markdownPatterns.codeBlock, '$1');
    plainText = plainText.replace(this.markdownPatterns.bold, '$1');
    plainText = plainText.replace(this.markdownPatterns.italic, '$1');
    plainText = plainText.replace(this.markdownPatterns.code, '$1');
    plainText = plainText.replace(this.markdownPatterns.strikethrough, '$1');
    plainText = plainText.replace(this.markdownPatterns.underline, '$1');
    plainText = plainText.replace(this.markdownPatterns.quote, '$1');
    
    return plainText.trim();
  }

  private markdownToHtml(content: string): string {
    let html = content;
    
    // Convert markdown to HTML
    html = html.replace(this.markdownPatterns.codeBlock, '<pre><code>$1</code></pre>');
    html = html.replace(this.markdownPatterns.bold, '<strong>$1</strong>');
    html = html.replace(this.markdownPatterns.italic, '<em>$1</em>');
    html = html.replace(this.markdownPatterns.code, '<code>$1</code>');
    html = html.replace(this.markdownPatterns.strikethrough, '<del>$1</del>');
    html = html.replace(this.markdownPatterns.underline, '<u>$1</u>');
    html = html.replace(this.markdownPatterns.quote, '<blockquote>$1</blockquote>');
    
    // Convert URLs to links
    html = html.replace(this.urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Convert @mentions to spans (would be styled by frontend)
    html = html.replace(this.mentionPattern, '<span class="mention" data-user="$1">@$1</span>');
    
    // Convert line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
  }

  private processImageAttachment(attachment: AttachmentDto): AttachmentDto {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const mimeType = attachment.metadata?.mimeType;
    
    if (mimeType && !allowedImageTypes.includes(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }
    
    // Set default metadata for images
    if (!attachment.metadata) {
      attachment.metadata = {};
    }
    
    // Images should have dimensions if not provided
    if (!attachment.metadata.width || !attachment.metadata.height) {
      // In a real implementation, you would analyze the image to get dimensions
      attachment.metadata.width = attachment.metadata.width || 0;
      attachment.metadata.height = attachment.metadata.height || 0;
    }
    
    return attachment;
  }

  private processFileAttachment(attachment: AttachmentDto): AttachmentDto {
    const allowedFileTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];
    
    const mimeType = attachment.metadata?.mimeType;
    if (mimeType && !allowedFileTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
    
    // Validate file size (10MB max for files)
    if (attachment.size && attachment.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }
    
    return attachment;
  }

  private processLinkAttachment(attachment: AttachmentDto): AttachmentDto {
    // Validate URL format
    try {
      new URL(attachment.url);
    } catch {
      throw new Error(`Invalid URL format: ${attachment.url}`);
    }
    
    // Ensure link attachments have appropriate metadata
    if (!attachment.metadata) {
      attachment.metadata = {};
    }
    
    return attachment;
  }

  private generateAttachmentSummary(types: string[]): string {
    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const parts: string[] = [];
    
    if (typeCounts.image) {
      parts.push(`${typeCounts.image} image${typeCounts.image > 1 ? 's' : ''}`);
    }
    
    if (typeCounts.file) {
      parts.push(`${typeCounts.file} file${typeCounts.file > 1 ? 's' : ''}`);
    }
    
    if (typeCounts.link) {
      parts.push(`${typeCounts.link} link${typeCounts.link > 1 ? 's' : ''}`);
    }
    
    return `(${parts.join(', ')})`;
  }
}
