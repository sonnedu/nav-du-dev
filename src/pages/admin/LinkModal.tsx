import { useState } from 'react';
import { AdminCombobox } from './AdminCombobox';
import { AdminDialog } from './AdminDialog';
import { useI18n } from '../../lib/useI18n';
import type { NavLink, NavCategory } from '../../lib/navTypes';
import { slugifyId, normalizeUrl } from '../../lib/admin/adminUtils';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  link?: NavLink;
  categories: NavCategory[];
  onSave: (categoryId: string, link: NavLink) => Promise<void>;
  onDelete?: (categoryId: string, linkId: string) => Promise<void>;
}

export function LinkModal({
  isOpen,
  onClose,
  categoryId,
  link,
  categories,
  onSave,
  onDelete
}: LinkModalProps) {
  const { m } = useI18n();
  const [targetCategoryId, setTargetCategoryId] = useState(() => categoryId);
  const [name, setName] = useState(() => link?.name ?? '');
  const [url, setUrl] = useState(() => link?.url ?? '');
  const [desc, setDesc] = useState(() => link?.desc ?? '');
  const [tags, setTags] = useState(() => link?.tags?.join(', ') ?? '');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = normalizeUrl(url);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const nextLink: NavLink = {
      id: link?.id ?? slugifyId(name),
      name: name.trim(),
      url: normalizedUrl,
      desc: desc.trim() || undefined,
      tags: tagList.length > 0 ? tagList : undefined
    };
    
    void onSave(targetCategoryId, nextLink);
    onClose();
  };

  return (
    <>
      <AdminDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          if (link && onDelete) {
            void onDelete(categoryId, link.id);
            onClose();
          }
        }}
        title={m.admin.delete}
        message={m.admin.delete}
        variant="danger"
      />
      <div className="admin-modal-backdrop" onClick={onClose}>
        <div className="admin-modal" onClick={e => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h2 className="admin-modal-title">{link ? m.admin.editSiteTitle : m.admin.addSiteTitle}</h2>
            <button className="btn btn-icon" onClick={onClose}>✕</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.category}</label>
                <AdminCombobox
                  className="admin-combobox"
                  inputClassName="admin-select"
                  listClassName="admin-combobox-list"
                  ariaLabel={m.admin.category}
                  placeholder={m.admin.category}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  value={targetCategoryId}
                  onChange={setTargetCategoryId}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.siteName}</label>
                <input 
                  className="admin-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.url}</label>
                <input 
                  className="admin-input"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.descriptionOptional}</label>
                <textarea 
                  className="admin-input"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">{m.admin.tagsOptional}</label>
                <input 
                  className="admin-input"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="tag1, tag2"
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              {link && onDelete && (
                <button 
                  type="button" 
                  className="btn btn-danger mr-auto" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  {m.admin.delete}
                </button>
              )}
              <button type="button" className="btn" onClick={onClose}>{m.admin.cancel}</button>
              <button type="submit" className="btn btn-primary" disabled={!name.trim() || !url.trim()}>
                {m.admin.save}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
