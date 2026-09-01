// English.
//
// 판정 문구는 "OK to use" 같은 표현을 쓰지 않는다. 이 앱은 라벨에 적힌 규격이
// 서로 맞는지만 본다. 사용해도 된다는 승인이 아니다. 그래서 "SPECS MATCH"다.

import type { Messages } from './ko';

export const en: Messages = {
  'common.home': 'Home',
  'common.grinder': 'Grinder',
  'common.wheel': 'Wheel',
  'common.language': 'Language',

  'home.title': 'WheelMatch AI',
  'home.subtitle': 'Grinder and wheel specification check',
  'home.question': "Today's job?",
  'home.cutting': 'Cutting',
  'home.cuttingHint': 'Cut-off work',
  'home.grinding': 'Grinding',
  'home.grindingHint': 'Grinding and sanding',
  'home.afterChoice':
    'After you choose, photograph the grinder nameplate, then the wheel label.',
  'home.history': 'View inspection history →',

  'verdict.compatible': 'SPECS MATCH',
  'verdict.incompatible': 'SPECS DO NOT MATCH',
  'verdict.undetermined': 'CANNOT DETERMINE',
  'verdict.note.compatible':
    'The printed specifications match each other. Complete the safety checklist below.',
  'verdict.note.incompatible':
    'Do not use this combination. Check the reasons below.',
  'verdict.note.undetermined':
    'There is not enough information to decide. Take the photos again or enter the values yourself.',

  'result.title': 'Specification check result',
  'result.loading': 'Loading the result...',
  'result.undetermined.help':
    'Some values are missing or were read with low confidence. Take the photos again or enter the values yourself to get a judgement.',
  'result.retakeGrinder': 'Start again from the grinder',
  'result.retakeWheel': 'Check the wheel again',
  'result.save': 'Finish and save',
  'result.saving': 'Saving...',
  'result.saveError': 'Saving failed. Check your storage space and try again.',

  'checks.title': 'Results for each check',
  'rule.requiredValues': 'Required values',
  'rule.rpmSafety': 'Speed rating',
  'rule.diameterFit': 'Diameter fit',
  'rule.purpose': 'Wheel use',
  'rule.workPurpose': 'Job match',
  'rule.wheelType': 'Wheel type',
  'rule.visibleDamage': 'Visible damage',
  'rule.peripheralSpeed': 'Speed cross-check',
  'rule.confidence': 'Reading confidence',

  'action.title': 'DO NOT USE',
  'action.rpmSafety':
    'Do not mount this wheel. Replace it with one rated at or above the grinder speed.',
  'action.diameterFit':
    'Do not mount this wheel. Replace it with one no larger than the grinder allows.',
  'action.workPurpose':
    "Fit a wheel made for today's job instead. A wheel made for other work can break.",
  'action.generic':
    'Do not mount this wheel. Replace it with one that meets the conditions.',

  'checklist.title': 'Safety checklist',
  'checklist.note': 'Check these yourself. The spec check does not cover them.',
  'checklist.guardCover': 'Guard fitted',
  'checklist.guardCoverHint':
    'Check that the wheel is covered at the required angle',
  'checklist.auxiliaryHandle': 'Side handle fitted',
  'checklist.auxiliaryHandleHint':
    'Check that you can hold it with both hands against kickback',
  'checklist.wheelDamage': 'Wheel undamaged',
  'checklist.wheelDamageHint':
    'Check for cracks, chips or warping (replace at once if found)',
  'checklist.ppe': 'PPE worn',
  'checklist.ppeHint': 'Check safety glasses, gloves and face shield',
  'checklist.preWork':
    'Just before you start, check that sparks are not aimed at people or flammable material.',
  'checklist.incomplete':
    'You must confirm all {count} safety checklist items before saving.',

  disclaimer:
    'This app only compares the specifications printed on the labels. It does not guarantee work safety and does not replace the manufacturer manual or your site safety rules.',

  'translation.notice':
    'This translation has not been reviewed yet. If the meaning is unclear, follow the Korean text and ask your supervisor.',
};
