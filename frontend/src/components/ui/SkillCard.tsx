import React from 'react';

interface Skill {
  id: number;
  name: string;
  skill_type: 'active' | 'passive';
  category: string;
  power?: number;
  value?: number;
  target?: string;
  trigger_rate?: number;
  cooldown?: number;
  duration?: number;
  description: string;
  unlock_level?: number;
  is_unlocked?: boolean;
}

interface SkillCardProps {
  skill: Skill;
  compact?: boolean;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, compact = false }) => {
  // Skill type colors
  const typeColors = {
    active: 'bg-red-100 text-red-700 border-red-300',
    passive: 'bg-blue-100 text-blue-700 border-blue-300',
  };

  // Category icons
  const getCategoryIcon = (category: string) => {
    if (category.includes('damage') || category === 'execute' || category === 'bleed') return '⚔️';
    if (category.includes('heal')) return '💚';
    if (category.includes('buff') || category === 'shield') return '🛡️';
    if (category.includes('debuff') || category === 'stun' || category === 'silence') return '💀';
    if (category === 'poison') return '☠️';
    if (category.includes('crit')) return '💥';
    if (category === 'lifesteal') return '🩸';
    if (category === 'dodge') return '💨';
    if (category === 'counter_attack') return '⚡';
    if (category.includes('boost')) return '📈';
    if (category === 'hp_regen') return '💖';
    if (category === 'last_stand') return '🔥';
    return '✨';
  };

  // Locked skill styling
  const isLocked = skill.is_unlocked === false;
  const lockedClass = isLocked ? 'opacity-50 grayscale' : '';

  if (compact) {
    return (
      <div
        className={`px-2 py-1 rounded-md border text-xs ${typeColors[skill.skill_type]} ${lockedClass}`}
        title={skill.description}
      >
        <span className="mr-1">{getCategoryIcon(skill.category)}</span>
        {skill.name}
        {isLocked && <span className="ml-1">🔒 Lv.{skill.unlock_level}</span>}
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-lg p-3 ${typeColors[skill.skill_type]} ${lockedClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getCategoryIcon(skill.category)}</span>
          <div>
            <h4 className="font-bold text-sm">{skill.name}</h4>
            <p className="text-xs opacity-75 capitalize">{skill.skill_type} - {skill.category.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {isLocked && (
          <div className="text-right">
            <div className="text-xs font-bold">🔒 Locked</div>
            <div className="text-xs">Unlock Lv.{skill.unlock_level}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-2 mb-2 text-xs">
        {skill.power && (
          <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
            <span className="font-semibold">Power:</span> {skill.power}
          </div>
        )}
        {skill.value !== undefined && skill.value > 0 && (
          <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
            <span className="font-semibold">Value:</span> {skill.value}{skill.category.includes('boost') || skill.category.includes('buff') || skill.category.includes('debuff') ? '%' : ''}
          </div>
        )}
        {skill.trigger_rate && skill.trigger_rate < 100 && (
          <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
            <span className="font-semibold">Trigger:</span> {skill.trigger_rate}%
          </div>
        )}
        {skill.cooldown && skill.cooldown > 0 && (
          <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
            <span className="font-semibold">CD:</span> {skill.cooldown}
          </div>
        )}
        {skill.duration && skill.duration > 0 && (
          <div className="bg-white bg-opacity-50 px-2 py-1 rounded">
            <span className="font-semibold">Duration:</span> {skill.duration}
          </div>
        )}
      </div>

      {/* Target */}
      {skill.target && (
        <div className="text-xs mb-2 bg-white bg-opacity-50 px-2 py-1 rounded">
          <span className="font-semibold">Target:</span> {skill.target.replace(/_/g, ' ')}
        </div>
      )}

      {/* Description */}
      <p className="text-xs leading-relaxed">{skill.description}</p>
    </div>
  );
};

export default SkillCard;
