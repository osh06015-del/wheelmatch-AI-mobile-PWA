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
  'result.saveStopped': 'Save the stop result',

  'group.confirmed': 'Confirmed',
  'group.conflicting': 'Does not match',
  'group.unreadable': 'Could not read',
  'group.manual': 'Check these yourself',
  'notVerifiable.title': 'What this app cannot check',
  'notVerifiable.note':
    'These were not part of the result. They cannot be known from a photo and a label.',

  'checks.title': 'Results for each check',
  'rule.requiredValues': 'Required values',
  'rule.rpmSafety': 'Max operating speed',
  'rule.diameterFit': 'Diameter fit',
  'rule.purpose': 'Wheel use',
  'rule.workPurpose': 'Job match',
  'rule.wheelType': 'Wheel type',
  'rule.visibleDamage': 'Visible damage',
  'rule.unitConsistency': 'Label consistency',
  'rule.mountingSpec': 'Mounting bore',
  'rule.peripheralSpeed': 'Speed cross-check',
  'rule.expiry': 'Expiry date',
  'rule.confidence': 'Reading confidence',
  'expiry.source':
    'Expiry basis: only the month/year printed on the label is used. It is never calculated from the manufacturing date. The marking format follows oSa "Product marking requirements for bonded abrasives" (2020-04, based on EN 12413:2019). The EN 12413 text itself was not read. Treating the marked month as valid through its last day is this app\'s reading, not a regulation. Korea\'s Rules on Occupational Safety and Health Standards Article 122 has no expiry clause.',

  'trialRun.title': 'Trial run',
  'trialRun.legalBasis':
    "Korea's Rules on Occupational Safety and Health Standards, Article 122(2), require a trial run of at least 1 minute before starting work and at least 3 minutes after replacing a wheel, checking the machine for anything abnormal. This app only times it and records your answer. It does not replace the procedure.",
  'trialRun.standClear':
    'During the trial run, stand clear of the wheel face and the direction of rotation.',
  'trialRun.replacedQuestion': 'Did you just replace the wheel?',
  'trialRun.startReplaced': 'Yes — start the {seconds}s trial run',
  'trialRun.startBeforeWork': 'No — start the {seconds}s trial run',
  'trialRun.modeReplaced': 'Trial run after replacing the wheel',
  'trialRun.modeBeforeWork': 'Trial run before starting work',
  'trialRun.running': 'Running for at least {seconds}s. Time left',
  'trialRun.elapsed':
    'The required time has passed. Report anything abnormal below.',
  'trialRun.waitNotice': 'You can answer once the required time has passed.',
  'trialRun.findingsTitle': 'Was anything abnormal during the trial run?',
  'trialRun.findingsHint':
    'Tick everything that applies. If you tick any, you can only continue as Problem found.',
  'trialRun.finding.vibration': 'Abnormal vibration',
  'trialRun.finding.noise': 'Abnormal noise',
  'trialRun.finding.wobble': 'Wheel wobble',
  'trialRun.finding.wheelDamage': 'Signs of wheel damage or coming loose',
  'trialRun.finding.equipment': 'Something wrong with the machine',
  'trialRun.confirmNormal': 'Nothing abnormal — confirmed',
  'trialRun.reportAbnormal': 'Problem found',
  'trialRun.stopTitle': 'Do not start work',
  'trialRun.stopBody':
    'Something abnormal was found during the trial run. Stop the machine, disconnect the power, then inspect how the wheel is mounted and check the machine.',
  'trialRun.required':
    'The specification check is done. You can save after the trial run.',

  'grinderCondition.title': 'Check the grinder yourself',
  'grinderCondition.note':
    'Before fitting a wheel, look over the whole grinder and answer these five.',
  'grinderCondition.aiBoundary':
    'The AI only reads the specification data on the nameplate. The condition of the grinder and the safety of the work must be checked by the operator.',
  'grinderCondition.cordAndPlug': 'Is the power cord and plug undamaged?',
  'grinderCondition.cordAndPlugHint':
    'Run your hand along the whole cord — stripped insulation, crushed spots, a cracked plug',
  'grinderCondition.body': 'Is the body free of cracks and heavy damage?',
  'grinderCondition.bodyHint':
    'Drop marks, a split housing, parts that have worked loose',
  'grinderCondition.guard': 'Is the guard fitted and firmly locked?',
  'grinderCondition.guardHint':
    'It must not move when you twist it by hand, and it must cover the wheel at the required angle',
  'grinderCondition.auxiliaryHandle':
    'Is the side handle fitted and firmly tightened?',
  'grinderCondition.auxiliaryHandleHint':
    'You must be able to hold the tool with both hands against kickback. If it moves, pick Problem found',
  'grinderCondition.spindle':
    'Is the spindle, flange and lock nut free of visible damage?',
  'grinderCondition.spindleHint':
    'Stripped threads, a bent or dirty flange, a worn nut',
  'grinderCondition.confirmed': 'Checked',
  'grinderCondition.issue': 'Problem found',
  'grinderCondition.incomplete':
    'You must check the remaining {count} item(s) yourself before moving on to the wheel.',
  'grinderCondition.stopTitle': 'Do not use this grinder',
  'grinderCondition.stopBody':
    'A problem with the equipment has been found. Do not use it. Have it inspected and repaired, then check again.',

  'wheelCondition.title': 'Check the wheel yourself',
  'wheelCondition.note':
    'Before mounting, inspect the actual wheel on both sides, around the edge, and at the mounting area.',
  'wheelCondition.aiBoundary':
    'AI can only flag suspected visible damage. It never confirms that a wheel is undamaged or that the work is safe.',
  'wheelCondition.aiDamageWarning':
    'AI suspects a visible sign of damage in the photo. Inspect the wheel closely yourself.',
  'wheelCondition.labelWarning':
    'AI could not read enough label information. Check the actual label and correct the values above.',
  'wheelCondition.expiryWarning':
    'AI could not read the expiry date. Check the month/year printed on the label yourself.',
  'wheelCondition.damageFree':
    'Is it free from breaks, cracks, hairline cracks, and edge chips?',
  'wheelCondition.damageFreeHint':
    'Do not rely on the photo; rotate and inspect the whole wheel in good light',
  'wheelCondition.notDeformed': 'Is the wheel free from warping or distortion?',
  'wheelCondition.notDeformedHint':
    'Choose Issue found if it is not flat or shows twisting or swelling',
  'wheelCondition.mountingAreaUndamaged':
    'Is the centre hole and mounting area visibly undamaged?',
  'wheelCondition.mountingAreaUndamagedHint':
    'Check both sides around the centre hole for chips, wear, or distortion',
  'wheelCondition.labelLegible':
    'Can you identify the label and essential specifications?',
  'wheelCondition.labelLegibleHint':
    'Confirm that you can read the markings needed for comparison, including RPM, diameter, and use',
  'wheelCondition.expiryValid': 'Is the printed expiry date still valid?',
  'wheelCondition.expiryValidHint':
    'Read the printed month/year; do not estimate it from the manufacturing date',
  'wheelCondition.confirmed': 'Confirmed',
  'wheelCondition.issue': 'Issue found',
  'wheelCondition.incomplete':
    'You must personally check the remaining {count} items before comparing specifications.',
  'wheelCondition.stopTitle': 'DO NOT USE THIS WHEEL',
  'wheelCondition.stopBody':
    'A problem was found with the wheel. Do not mount it. Replace it with another serviceable wheel and inspect again.',

  'action.title': 'DO NOT USE',
  'action.rpmSafety':
    'Do not mount this wheel. Replace it with one rated at or above the grinder speed.',
  'action.diameterFit':
    'Do not mount this wheel. Replace it with one no larger than the grinder allows.',
  'action.workPurpose':
    "Fit a wheel made for today's job instead. A wheel made for other work can break.",
  'action.expiry':
    'Do not mount this wheel. The expiry date on its label has passed. Replace it with one still within date.',
  'action.generic':
    'Do not mount this wheel. Replace it with one that meets the conditions.',

  'checklist.title': 'Safety checklist',
  'checklist.note': 'Check these yourself. The spec check does not cover them.',
  'checklist.ppe': 'PPE worn',
  'checklist.ppeHint': 'Check safety glasses, gloves and face shield',
  'checklist.workpiece': 'Workpiece is secured',
  'checklist.workpieceHint':
    'Held firmly in a vice or clamp. Never hold it with your hand or foot',
  'checklist.surroundings': 'People and flammables around you',
  'checklist.surroundingsHint':
    'Check that no one and nothing flammable is within reach of the sparks',
  'checklist.preWork':
    'Just before you start, check that sparks are not aimed at people or flammable material.',
  'checklist.incomplete':
    'You must confirm all {count} safety checklist items before saving.',

  disclaimer:
    'This app only compares the specifications printed on the labels. It does not guarantee work safety and does not replace the manufacturer manual or your site safety rules.',

  'translation.notice':
    'This translation has not been reviewed yet. If the meaning is unclear, follow the Korean text and ask your supervisor.',
};
